import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const LAUNCHER_TOKEN_DAYS = 30;

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

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) {
    s += String.fromCharCode(bytes[i]);
  }
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function encodeJsonBase64Url(data: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return toBase64Url(bytes);
}

async function hashCode(code: string, secret: string): Promise<string> {
  const payload = new TextEncoder().encode(`${code}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return bytesToHex(new Uint8Array(digest));
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

async function mintLauncherToken(
  secret: string,
  payload: Record<string, unknown>
): Promise<string> {
  const headerPart = encodeJsonBase64Url({ alg: "HS256", typ: "JWT" });
  const payloadPart = encodeJsonBase64Url(payload);
  const signingInput = `${headerPart}.${payloadPart}`;
  const signature = await hmacSha256(signingInput, secret);
  const signaturePart = toBase64Url(signature);
  return `${signingInput}.${signaturePart}`;
}

function parseCode(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as Record<string, unknown>).code;
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) return null;
  if (normalized.length > 24) return null;
  return normalized;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return fail(405, "method_not_allowed");
  }

  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const jwtSecret = getRequiredEnv("VEILNET_JWT_SECRET");

    const rawBody = await req.json().catch(() => null);
    const code = parseCode(rawBody);
    if (!code) {
      return fail(400, "invalid_or_expired");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const codeHash = await hashCode(code, jwtSecret);
    const nowIso = new Date().toISOString();

    const { data: matchRow, error: lookupError } = await admin
      .from("launcher_link_codes")
      .select("id, user_id, expires_at, used_at")
      .eq("code_hash", codeHash)
      .is("used_at", null)
      .gt("expires_at", nowIso)
      .maybeSingle();

    if (lookupError) {
      console.error("[launcher-exchange] lookup failed", lookupError);
      return fail(500, "lookup_failed");
    }

    if (!matchRow) {
      return fail(400, "invalid_or_expired");
    }

    const usedAtIso = new Date().toISOString();
    const { data: consumed, error: consumeError } = await admin
      .from("launcher_link_codes")
      .update({ used_at: usedAtIso })
      .eq("id", matchRow.id)
      .is("used_at", null)
      .select("user_id")
      .maybeSingle();

    if (consumeError) {
      console.error("[launcher-exchange] consume failed", consumeError);
      return fail(500, "consume_failed");
    }

    if (!consumed?.user_id) {
      return fail(400, "invalid_or_expired");
    }

    const userId = String(consumed.user_id);
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[launcher-exchange] profile lookup failed", profileError);
      return fail(500, "profile_lookup_failed");
    }

    const username = String(profile?.username || "").trim();
    if (!username) {
      return fail(409, "username_required");
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = nowSec + LAUNCHER_TOKEN_DAYS * 24 * 60 * 60;
    const token = await mintLauncherToken(jwtSecret, {
      sub: userId,
      username,
      typ: "launcher",
      iat: nowSec,
      exp: expSec
    });

    return json({ token, username, user_id: userId });
  } catch (err) {
    console.error("[launcher-exchange] fatal", err);
    return fail(500, "internal_error");
  }
});
