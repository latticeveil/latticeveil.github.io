import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const HASH_RE = /^[0-9a-f]{64}$/i;

type TicketRequest = {
  buildHash?: string;
  channel?: string;
  deviceId?: string | null;
};

type BuildRow = {
  channel: "dev" | "release";
  sha256: string;
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

function fail(status: number, error: string, extra: Record<string, unknown> = {}): Response {
  return json({ error, ...extra }, status);
}

function env(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function normalizeChannel(input: unknown): "dev" | "release" | null {
  const value = String(input || "").trim().toLowerCase();
  if (value === "dev" || value === "release") return value;
  return null;
}

function parseAdminAllowlist(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0)
  );
}

function sanitizeDeviceId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 200);
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

    const body = (await req.json().catch(() => null)) as TicketRequest | null;
    if (!body || typeof body !== "object") {
      return fail(400, "invalid_payload");
    }

    const channel = normalizeChannel(body.channel);
    if (!channel) {
      return fail(400, "invalid_channel");
    }

    const buildHash = String(body.buildHash || "").trim().toLowerCase();
    if (!HASH_RE.test(buildHash)) {
      return fail(400, "invalid_build_hash");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const { data: buildRow, error: buildError } = await admin
      .from("game_builds")
      .select("channel, sha256")
      .eq("channel", channel)
      .maybeSingle();

    if (buildError) {
      console.error("[online-ticket] build_query_failed", buildError);
      return fail(500, "build_query_failed");
    }

    const official = buildRow as BuildRow | null;
    if (!official?.sha256) {
      return fail(503, "official_hash_unavailable");
    }

    if (channel === "dev") {
      const adminEmails = parseAdminAllowlist(Deno.env.get("ADMIN_EMAILS") || "");
      const userEmail = String(user.email || "").trim().toLowerCase();
      const isAdmin = userEmail.length > 0 && adminEmails.has(userEmail);

      let isTester = false;
      const { data: testerRow } = await admin
        .from("dev_testers")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      isTester = !!testerRow;

      if (!isAdmin && !isTester) {
        return fail(403, "DEV_CHANNEL_NOT_ALLOWED", { lanAllowed: true });
      }
    }

    if (buildHash !== String(official.sha256 || "").toLowerCase()) {
      return fail(403, "UNOFFICIAL_BUILD", { lanAllowed: true });
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { data: inserted, error: insertError } = await admin
      .from("online_tickets")
      .insert({
        user_id: user.id,
        device_id: sanitizeDeviceId(body.deviceId),
        build_hash: buildHash,
        channel,
        expires_at: expiresAt
      })
      .select("id, expires_at")
      .maybeSingle();

    if (insertError || !inserted) {
      console.error("[online-ticket] ticket_insert_failed", insertError);
      return fail(500, "ticket_insert_failed");
    }

    return json({
      ticketId: inserted.id,
      expiresAt: inserted.expires_at
    });
  } catch (error) {
    console.error("[online-ticket] fatal", error);
    return fail(500, "internal_error");
  }
});
