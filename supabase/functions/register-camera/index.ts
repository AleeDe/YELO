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

function getDefaultKey(name: "SUPABASE_PUBLISHABLE_KEYS" | "SUPABASE_SECRET_KEYS") {
  const value = Deno.env.get(name);
  if (!value) return null;
  const keys = JSON.parse(value) as Record<string, string>;
  return keys.default ?? Object.values(keys)[0] ?? null;
}

function createDeviceToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const encoded = btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `yelo_cam_${encoded}`;
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
  const publishableKey =
    getDefaultKey("SUPABASE_PUBLISHABLE_KEYS") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const secretKey =
    getDefaultKey("SUPABASE_SECRET_KEYS") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");
  if (!supabaseUrl || !publishableKey || !secretKey || !authorization) {
    return json({ error: "Function authentication is not configured." }, 500);
  }

  const callerClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: caller, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller.user) return json({ error: "Your session is invalid or expired." }, 401);

  let body: {
    societyId?: string;
    name?: string;
    locationLabel?: string;
    sourceType?: "mobile" | "webcam" | "rtsp" | "recorded_video";
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const societyId = body.societyId?.trim();
  const name = body.name?.trim();
  const locationLabel = body.locationLabel?.trim();
  const sourceType = body.sourceType;
  if (!societyId || !name || name.length < 2 || name.length > 120) {
    return json({ error: "Society and a camera name of 2 to 120 characters are required." }, 400);
  }
  if (!sourceType || !["mobile", "webcam", "rtsp", "recorded_video"].includes(sourceType)) {
    return json({ error: "Select a valid camera source." }, 400);
  }

  const { data: canManage, error: permissionError } =
    await callerClient.rpc("is_society_admin", { target_society_id: societyId });
  if (permissionError || !canManage) {
    return json({ error: "You cannot register cameras for this society." }, 403);
  }

  const deviceToken = createDeviceToken();
  const deviceTokenHash = await sha256(deviceToken);
  const { data: camera, error: cameraError } = await adminClient
    .from("cameras")
    .insert({
      society_id: societyId,
      name,
      location_label: locationLabel || null,
      source_type: sourceType,
      status: "pending",
      device_token_hash: deviceTokenHash,
      created_by: caller.user.id,
    })
    .select("id, name, source_type, status")
    .single();

  if (cameraError || !camera) {
    return json({ error: cameraError?.message ?? "The camera could not be registered." }, 500);
  }

  await adminClient.from("audit_logs").insert({
    society_id: societyId,
    actor_id: caller.user.id,
    action: "camera.registered",
    entity_type: "camera",
    entity_id: camera.id,
    metadata: { source_type: sourceType },
  });

  return json({
    camera,
    deviceToken,
    message: "Copy this token now. It cannot be shown again.",
  });
});
