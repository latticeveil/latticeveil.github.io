import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 9;
const EXPIRY_MINUTES = 10;
const MAX_INSERT_RETRIES = 5;

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

function randomCode(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

function firstIpFromForwarded(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const first = headerValue.split(",")[0]?.trim();
  return first || null;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

async function hashCode(code: string, secret: string): Promise<string> {
  const payload = new TextEncoder().encode(`${code}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return bytesToHex(new Uint8Array(digest));
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
    const anonKey = getRequiredEnv("SUPABASE_ANON_KEY");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const jwtSecret = getRequiredEnv("VEILNET_JWT_SECRET");

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) {
      return fail(401, "missing_authorization");
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const {
      data: { user },
      error: authError
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return fail(401, "invalid_auth_token");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[launcher-issue] profile lookup failed", profileError);
      return fail(500, "profile_lookup_failed");
    }

    const username = String(profile?.username || "").trim();
    if (!username) {
      return fail(409, "username_required");
    }

    const expiresAtIso = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000).toISOString();
    const issuedIp = firstIpFromForwarded(req.headers.get("x-forwarded-for"));
    const userAgent = req.headers.get("user-agent");

    for (let attempt = 0; attempt < MAX_INSERT_RETRIES; attempt += 1) {
      const code = randomCode(CODE_LENGTH);
      const codeHash = await hashCode(code, jwtSecret);

      const { error: insertError } = await admin
        .from("launcher_link_codes")
        .insert({
          user_id: user.id,
          code_hash: codeHash,
          expires_at: expiresAtIso,
          issued_ip: issuedIp,
          user_agent: userAgent
        });

      if (!insertError) {
        return json({ code, expires_at: expiresAtIso });
      }

      if (insertError.code === "23505") {
        continue;
      }

      console.error("[launcher-issue] insert failed", insertError);
      return fail(500, "code_issue_failed");
    }

    return fail(500, "code_issue_collision_retry_exhausted");
  } catch (err) {
    console.error("[launcher-issue] fatal", err);
    return fail(500, "internal_error");
  }
});
