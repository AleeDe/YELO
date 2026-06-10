import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getDefaultKey(name: "SUPABASE_SECRET_KEYS") {
  const value = Deno.env.get(name);
  if (!value) return null;
  const keys = JSON.parse(value) as Record<string, string>;
  return keys.default ?? Object.values(keys)[0] ?? null;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey =
    getDefaultKey("SUPABASE_SECRET_KEYS") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !secretKey) {
    return json({ error: "Device authentication is not configured." }, 500);
  }

  let body: {
    action?: "pair" | "heartbeat" | "disconnect";
    token?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const action = body.action;
  const token = body.token?.trim();
  if (!action || !["pair", "heartbeat", "disconnect"].includes(action) || !token) {
    return json({ error: "A valid action and device token are required." }, 400);
  }
  if (!token.startsWith("yelo_cam_") || token.length > 128) {
    return json({ error: "This camera token is invalid or has been revoked." }, 401);
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tokenHash = await sha256(token);
  const { data: camera, error: cameraError } = await adminClient
    .from("cameras")
    .select("id, society_id, name, location_label, source_type, status, detection_enabled, confirmation_seconds, signaling_key, restricted_zones(id, name, polygon, is_active)")
    .eq("device_token_hash", tokenHash)
    .maybeSingle();

  if (cameraError) return json({ error: "The camera could not be authenticated." }, 500);
  if (!camera || camera.status === "disabled") {
    return json({ error: "This camera token is invalid or has been revoked." }, 401);
  }

  const now = new Date().toISOString();
  const nextStatus = action === "heartbeat" ? "online" : "offline";
  const { data: updatedCamera, error: updateError } = await adminClient
    .from("cameras")
    .update({ status: nextStatus, last_seen_at: now })
    .eq("id", camera.id)
    .select("id, society_id, name, location_label, source_type, status, last_seen_at, detection_enabled, confirmation_seconds, signaling_key")
    .single();

  if (updateError || !updatedCamera) {
    return json({ error: "The camera status could not be updated." }, 500);
  }

  if (action !== "heartbeat") {
    await adminClient.from("audit_logs").insert({
      society_id: camera.society_id,
      actor_id: null,
      action: action === "pair" ? "camera.paired" : "camera.disconnected",
      entity_type: "camera",
      entity_id: camera.id,
      metadata: { source_type: camera.source_type },
    });
  }

  return json({
    camera: {
      ...updatedCamera,
      restricted_zones: camera.restricted_zones ?? [],
    },
  });
});
