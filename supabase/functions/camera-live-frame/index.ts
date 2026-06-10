import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "apikey, content-type, x-yelo-camera-id, x-yelo-camera-token, x-yelo-captured-at",
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
  if (request.headers.get("content-type") !== "image/jpeg") {
    return json({ error: "Send the live frame as image/jpeg." }, 415);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey =
    getDefaultKey("SUPABASE_SECRET_KEYS") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !secretKey) {
    return json({ error: "Live frame delivery is not configured." }, 500);
  }

  const cameraId = request.headers.get("x-yelo-camera-id")?.trim() ?? "";
  const token = request.headers.get("x-yelo-camera-token")?.trim() ?? "";
  if (!cameraId || !token.startsWith("yelo_cam_")) {
    return json({ error: "Camera ID and device token are required." }, 401);
  }

  const frame = new Uint8Array(await request.arrayBuffer());
  if (frame.byteLength < 4 || frame.byteLength > 2 * 1024 * 1024) {
    return json({ error: "Live frame must be smaller than 2 MB." }, 413);
  }
  if (
    frame[0] !== 0xff ||
    frame[1] !== 0xd8 ||
    frame[frame.length - 2] !== 0xff ||
    frame[frame.length - 1] !== 0xd9
  ) {
    return json({ error: "Live frame must be a valid JPEG image." }, 415);
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tokenHash = await sha256(token);
  const { data: camera, error: cameraError } = await admin
    .from("cameras")
    .select("id, society_id, status")
    .eq("id", cameraId)
    .eq("device_token_hash", tokenHash)
    .maybeSingle();
  if (cameraError) return json({ error: "The camera could not be authenticated." }, 500);
  if (!camera || camera.status === "disabled") {
    return json({ error: "This camera cannot publish live frames." }, 401);
  }

  const capturedAtHeader = request.headers.get("x-yelo-captured-at");
  const capturedAt = capturedAtHeader && !Number.isNaN(Date.parse(capturedAtHeader))
    ? new Date(capturedAtHeader).toISOString()
    : new Date().toISOString();
  const storagePath = `live/${camera.society_id}/${camera.id}.jpg`;
  const { error: uploadError } = await admin.storage
    .from("camera-live-frames")
    .upload(storagePath, frame, {
      contentType: "image/jpeg",
      cacheControl: "0",
      upsert: true,
    });
  if (uploadError) return json({ error: "The latest frame could not be published." }, 500);

  const { error: updateError } = await admin
    .from("cameras")
    .update({ latest_frame_at: capturedAt })
    .eq("id", camera.id);
  if (updateError) return json({ error: "Frame freshness could not be updated." }, 500);

  return json({ accepted: true, capturedAt, storagePath }, 202);
});
