import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

const EMPTY_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
    return fail(405, "method_not_allowed");
  }

  try {
    const client = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      auth: { persistSession: false }
    });

    const { data, error } = await client
      .from("game_builds")
      .select("channel, sha256, updated_at")
      .in("channel", ["dev", "release"]);

    if (error) {
      console.error("[game-hashes-get] query_failed", error);
      return fail(500, "query_failed");
    }

    const rows = Array.isArray(data) ? (data as BuildRow[]) : [];
    const dev = rows.find((row) => row.channel === "dev");
    const release = rows.find((row) => row.channel === "release");

    return json({
      dev: dev ?? { channel: "dev", sha256: EMPTY_HASH, updated_at: null },
      release: release ?? { channel: "release", sha256: EMPTY_HASH, updated_at: null }
    });
  } catch (error) {
    console.error("[game-hashes-get] fatal", error);
    return fail(500, "internal_error");
  }
});
