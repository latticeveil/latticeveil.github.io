import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const HASH_RE = /^[0-9a-f]{64}$/i;

type RequestBody = {
  action?: string;
  channel?: string;
  hash_sha256?: string;
};

type BuildRow = {
  channel: "dev" | "release";
  sha256: string;
  updated_at: string;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json"
    }
  });
}

function fail(status: number, error: string): Response {
  return json({ error }, status);
}

function env(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parseAdminAllowlist(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0)
  );
}

function normalizeChannel(input: unknown): "dev" | "release" | null {
  const value = String(input || "").trim().toLowerCase();
  if (value === "dev" || value === "release") return value;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return fail(405, "method_not_allowed");
  }

  try {
    const supabaseUrl = env("SUPABASE_URL");
    const anonKey = env("SUPABASE_ANON_KEY");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");

    const adminEmailsRaw = Deno.env.get("ADMIN_EMAILS")?.trim() || "";
    if (!adminEmailsRaw) {
      return fail(500, "ADMIN_EMAILS not configured");
    }

    const adminEmails = parseAdminAllowlist(adminEmailsRaw);
    if (adminEmails.size === 0) {
      return fail(500, "ADMIN_EMAILS not configured");
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) {
      return fail(401, "missing_authorization");
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });

    const {
      data: { user },
      error: userError
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return fail(401, "invalid_auth_token");
    }

    const userEmail = String(user.email || "").trim().toLowerCase();
    if (!userEmail || !adminEmails.has(userEmail)) {
      return fail(403, "not_authorized");
    }

    const body = (await req.json().catch(() => null)) as RequestBody | null;
    if (!body || typeof body !== "object") {
      return fail(400, "invalid_payload");
    }

    if (String(body.action || "").trim().toLowerCase() === "check") {
      return json({ is_admin: true });
    }

    const channel = normalizeChannel(body.channel);
    if (!channel) {
      return fail(400, "invalid_channel");
    }

    const hashSha256 = String(body.hash_sha256 || "").trim().toLowerCase();
    if (!HASH_RE.test(hashSha256)) {
      return fail(400, "invalid_hash_sha256");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const { data, error } = await admin
      .from("game_builds")
      .upsert(
        {
          channel,
          sha256: hashSha256,
          updated_at: new Date().toISOString()
        },
        { onConflict: "channel" }
      )
      .select("channel, sha256, updated_at")
      .maybeSingle();

    if (error) {
      console.error("[admin-set-build] update_failed", error);
      return fail(500, "update_failed");
    }

    return json({ ok: true, row: data as BuildRow | null });
  } catch (error) {
    console.error("[admin-set-build] fatal", error);
    return fail(500, "internal_error");
  }
});
