import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const HASH_RE = /^[0-9a-f]{64}$/i;

type SetBody = {
  action?: string;
  channel?: string;
  hash_sha256?: string;
  version?: string | null;
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

function fail(status: number, error: string): Response {
  return json({ error }, status);
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseAdminEmails(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v.length > 0)
  );
}

function normalizeChannel(channel: string | undefined): "dev" | "release" | null {
  const value = String(channel || "").trim().toLowerCase();
  if (value === "dev" || value === "release") return value;
  return null;
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
    const adminEmailsRaw = Deno.env.get("ADMIN_EMAILS")?.trim() || "";

    if (!adminEmailsRaw) {
      return fail(500, "ADMIN_EMAILS not configured");
    }

    const adminEmails = parseAdminEmails(adminEmailsRaw);
    if (adminEmails.size === 0) {
      return fail(500, "ADMIN_EMAILS not configured");
    }

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

    const email = String(user.email || "").trim().toLowerCase();
    if (!email || !adminEmails.has(email)) {
      return fail(403, "not_authorized");
    }

    const body = (await req.json().catch(() => null)) as SetBody | null;
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

    const hash = String(body.hash_sha256 || "").trim().toLowerCase();
    if (!HASH_RE.test(hash)) {
      return fail(400, "invalid_hash_sha256");
    }

    const versionRaw = body.version;
    const version =
      typeof versionRaw === "string" && versionRaw.trim().length > 0
        ? versionRaw.trim().slice(0, 120)
        : null;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const payload = {
      channel,
      hash_sha256: hash,
      version,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    const { data: updated, error: upsertError } = await admin
      .from("game_hashes")
      .upsert(payload, { onConflict: "channel" })
      .select("channel, hash_sha256, version, updated_at, updated_by")
      .maybeSingle();

    if (upsertError) {
      console.error("[game-hashes-set] upsert failed", upsertError);
      return fail(500, "update_failed");
    }

    return json({ ok: true, row: updated });
  } catch (err) {
    console.error("[game-hashes-set] fatal", err);
    return fail(500, "internal_error");
  }
});
