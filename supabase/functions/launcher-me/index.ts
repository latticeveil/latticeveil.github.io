import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function fail(status: number, error: string, extra?: Record<string, unknown>): Response {
  return json({ error, ...(extra || {}) }, status);
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) {
    s += String.fromCharCode(bytes[i]);
  }
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmacSha256(input: string, secret: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(input));
  return new Uint8Array(sig);
}

function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const value = authHeader.trim();
  if (!value.toLowerCase().startsWith("bearer ")) return null;
  const token = value.slice(7).trim();
  return token || null;
}

type LauncherClaims = {
  sub: string;
  username?: string;
  typ: string;
  iat?: number;
  exp?: number;
};

async function verifyLauncherToken(token: string, secret: string): Promise<LauncherClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerPart, payloadPart, signaturePart] = parts;
  const signingInput = `${headerPart}.${payloadPart}`;
  const expectedSignature = await hmacSha256(signingInput, secret);
  const expectedSignaturePart = toBase64Url(expectedSignature);
  if (signaturePart !== expectedSignaturePart) return null;

  let header: Record<string, unknown>;
  let payload: LauncherClaims;
  try {
    header = JSON.parse(new TextDecoder().decode(fromBase64Url(headerPart)));
    payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadPart)));
  } catch {
    return null;
  }

  if (header.alg !== "HS256" || header.typ !== "JWT") return null;
  if (!payload || payload.typ !== "launcher") return null;
  if (!payload.sub || typeof payload.sub !== "string") return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= nowSec) return null;

  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return fail(405, "method_not_allowed");
  }

  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const jwtSecret = getRequiredEnv("VEILNET_JWT_SECRET");

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    const token = parseBearerToken(authHeader);
    if (!token) {
      return fail(401, "missing_launcher_token");
    }

    const claims = await verifyLauncherToken(token, jwtSecret);
    if (!claims) {
      return fail(401, "invalid_launcher_token");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("username")
      .eq("id", claims.sub)
      .maybeSingle();

    if (profileError) {
      console.error("[launcher-me] profile lookup failed", profileError);
      return fail(500, "profile_lookup_failed");
    }

    const username = String(profile?.username || "").trim();
    if (!username) {
      return fail(409, "username_required");
    }

    return json({ username, user_id: claims.sub });
  } catch (err) {
    console.error("[launcher-me] fatal", err);
    return fail(500, "internal_error");
  }
});
