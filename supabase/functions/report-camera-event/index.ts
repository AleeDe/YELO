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
    return json({ error: "Event reporting is not configured." }, 500);
  }

  let body: {
    token?: string;
    cameraId?: string;
    zoneId?: string;
    objectClass?: string;
    confidence?: number;
    capturedAt?: string;
    eventKey?: string;
    metadata?: Record<string, unknown>;
    evidenceBase64?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const token = body.token?.trim() ?? "";
  const cameraId = body.cameraId?.trim() ?? "";
  const zoneId = body.zoneId?.trim() ?? "";
  const objectClass = body.objectClass?.trim().toLowerCase() ?? "";
  const eventKey = body.eventKey?.trim() ?? "";
  const confidence = Number(body.confidence);
  const capturedAt = body.capturedAt && !Number.isNaN(Date.parse(body.capturedAt))
    ? new Date(body.capturedAt).toISOString()
    : new Date().toISOString();

  if (
    !token.startsWith("yelo_cam_") ||
    !cameraId ||
    !zoneId ||
    objectClass.length < 2 ||
    objectClass.length > 80 ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1 ||
    !/^[a-f0-9]{64}$/.test(eventKey) ||
    !body.evidenceBase64
  ) {
    return json({ error: "The event report is incomplete or invalid." }, 400);
  }

  let evidence: Uint8Array;
  try {
    evidence = decodeBase64(body.evidenceBase64);
  } catch {
    return json({ error: "The evidence image is not valid base64." }, 400);
  }
  if (evidence.byteLength < 4 || evidence.byteLength > 2 * 1024 * 1024) {
    return json({ error: "Evidence must be a JPEG image smaller than 2 MB." }, 413);
  }
  if (
    evidence[0] !== 0xff ||
    evidence[1] !== 0xd8 ||
    evidence[evidence.length - 2] !== 0xff ||
    evidence[evidence.length - 1] !== 0xd9
  ) {
    return json({ error: "Evidence must be a valid JPEG image." }, 415);
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tokenHash = await sha256(token);
  const { data: camera, error: cameraError } = await admin
    .from("cameras")
    .select("id, society_id, name, detection_enabled, status")
    .eq("id", cameraId)
    .eq("device_token_hash", tokenHash)
    .maybeSingle();
  if (cameraError) return json({ error: "The camera could not be authenticated." }, 500);
  if (!camera || camera.status === "disabled" || !camera.detection_enabled) {
    return json({ error: "This camera cannot report detection events." }, 401);
  }

  const { data: zone } = await admin
    .from("restricted_zones")
    .select("id, name")
    .eq("id", zoneId)
    .eq("camera_id", camera.id)
    .eq("society_id", camera.society_id)
    .eq("is_active", true)
    .maybeSingle();
  if (!zone) return json({ error: "The restricted zone is invalid or inactive." }, 400);

  const { data: duplicate } = await admin
    .from("detection_events")
    .select("id")
    .eq("camera_id", camera.id)
    .contains("metadata", { event_key: eventKey })
    .maybeSingle();
  if (duplicate) return json({ eventId: duplicate.id, duplicate: true });

  const eventId = crypto.randomUUID();
  const metadata = {
    ...(body.metadata ?? {}),
    event_key: eventKey,
    source: "yelo_local_inference",
    zone_name: zone.name,
  };
  const { error: eventError } = await admin.from("detection_events").insert({
    id: eventId,
    society_id: camera.society_id,
    camera_id: camera.id,
    zone_id: zone.id,
    event_type: "possible_littering",
    status: "new",
    object_class: objectClass,
    confidence,
    detected_at: capturedAt,
    metadata,
  });
  if (eventError) return json({ error: "The incident record could not be created." }, 500);

  const storagePath = `events/${camera.society_id}/${eventId}.jpg`;
  const { error: uploadError } = await admin.storage
    .from("event-evidence")
    .upload(storagePath, evidence, {
      contentType: "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) {
    await admin.from("detection_events").delete().eq("id", eventId);
    return json({ error: "The evidence image could not be stored." }, 500);
  }

  const { error: mediaError } = await admin.from("event_media").insert({
    society_id: camera.society_id,
    event_id: eventId,
    media_type: "image",
    storage_path: storagePath,
    captured_at: capturedAt,
  });
  if (mediaError) {
    await admin.storage.from("event-evidence").remove([storagePath]);
    await admin.from("detection_events").delete().eq("id", eventId);
    return json({ error: "The evidence record could not be created." }, 500);
  }

  const { data: members } = await admin
    .from("society_members")
    .select("user_id")
    .eq("society_id", camera.society_id)
    .eq("is_active", true);
  if (members?.length) {
    await admin.from("notifications").insert(
      members.map((member) => ({
        society_id: camera.society_id,
        user_id: member.user_id,
        event_id: eventId,
        title: `Possible littering at ${camera.name}`,
      })),
    );
  }

  await admin.from("audit_logs").insert({
    society_id: camera.society_id,
    actor_id: null,
    action: "event.created",
    entity_type: "detection_event",
    entity_id: eventId,
    metadata: { camera_id: camera.id, zone_id: zone.id, object_class: objectClass },
  });

  return json({ eventId, duplicate: false }, 201);
});
