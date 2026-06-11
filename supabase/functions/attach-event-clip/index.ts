import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

const MAX_CLIP_BYTES = 25 * 1024 * 1024;

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

function decodeBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey =
    getDefaultKey("SUPABASE_SECRET_KEYS") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !secretKey) {
    return json({ error: "Clip reporting is not configured." }, 500);
  }

  let body: {
    token?: string;
    cameraId?: string;
    eventKey?: string;
    contentType?: string;
    extension?: string;
    startedAt?: string;
    clipBase64?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const token = body.token?.trim() ?? "";
  const cameraId = body.cameraId?.trim() ?? "";
  const eventKey = body.eventKey?.trim() ?? "";
  const contentType = body.contentType?.trim() ?? "";
  const extension = body.extension?.trim() ?? "";
  const startedAt = body.startedAt && !Number.isNaN(Date.parse(body.startedAt))
    ? new Date(body.startedAt).toISOString()
    : new Date().toISOString();

  if (
    !token.startsWith("yelo_cam_") ||
    !cameraId ||
    !/^[a-f0-9]{64}$/.test(eventKey) ||
    !["video/mp4", "video/webm"].includes(contentType) ||
    !["mp4", "webm"].includes(extension) ||
    !body.clipBase64
  ) {
    return json({ error: "The clip report is incomplete or invalid." }, 400);
  }

  let clip: Uint8Array;
  try {
    clip = decodeBase64(body.clipBase64);
  } catch {
    return json({ error: "The clip is not valid base64." }, 400);
  }
  if (clip.byteLength < 1024 || clip.byteLength > MAX_CLIP_BYTES) {
    return json({ error: "Clips must be between 1 KB and 25 MB." }, 413);
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tokenHash = await sha256(token);
  const { data: camera, error: cameraError } = await admin
    .from("cameras")
    .select("id, society_id, status, detection_enabled")
    .eq("id", cameraId)
    .eq("device_token_hash", tokenHash)
    .maybeSingle();
  if (cameraError) return json({ error: "The camera could not be authenticated." }, 500);
  if (!camera || camera.status === "disabled" || !camera.detection_enabled) {
    return json({ error: "This camera cannot attach evidence clips." }, 401);
  }

  const { data: event } = await admin
    .from("detection_events")
    .select("id, society_id")
    .eq("camera_id", camera.id)
    .contains("metadata", { event_key: eventKey })
    .maybeSingle();
  if (!event) return json({ error: "No matching detection event was found." }, 404);

  const { data: existing } = await admin
    .from("event_media")
    .select("id")
    .eq("event_id", event.id)
    .eq("media_type", "video")
    .maybeSingle();
  if (existing) return json({ eventId: event.id, duplicate: true });

  const storagePath = `events/${camera.society_id}/${event.id}-clip.${extension}`;
  const { error: uploadError } = await admin.storage
    .from("event-evidence")
    .upload(storagePath, clip, {
      contentType,
      cacheControl: "3600",
      upsert: true,
    });
  if (uploadError) {
    return json({ error: "The evidence clip could not be stored." }, 500);
  }

  const { error: mediaError } = await admin.from("event_media").insert({
    society_id: camera.society_id,
    event_id: event.id,
    media_type: "video",
    storage_path: storagePath,
    captured_at: startedAt,
  });
  if (mediaError) {
    await admin.storage.from("event-evidence").remove([storagePath]);
    return json({ error: "The clip record could not be created." }, 500);
  }

  return json({ eventId: event.id, duplicate: false }, 201);
});
