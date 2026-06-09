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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    getDefaultKey("SUPABASE_PUBLISHABLE_KEYS") ??
    Deno.env.get("SUPABASE_ANON_KEY");
  const secretKey =
    getDefaultKey("SUPABASE_SECRET_KEYS") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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
  if (callerError || !caller.user) {
    return json({ error: "Your session is invalid or expired." }, 401);
  }

  const { data: isSuperAdmin, error: roleError } =
    await callerClient.rpc("is_super_admin");
  if (roleError || !isSuperAdmin) {
    return json({ error: "Only a Super Administrator can send this invitation." }, 403);
  }

  let body: {
    societyId?: string;
    email?: string;
    fullName?: string;
    role?: "society_admin" | "operator";
    redirectTo?: string;
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const societyId = body.societyId?.trim();
  const email = body.email?.trim().toLowerCase();
  const fullName = body.fullName?.trim();
  const role = body.role ?? "society_admin";

  if (!societyId || !email || !email.includes("@")) {
    return json({ error: "A society and valid email address are required." }, 400);
  }
  if (!["society_admin", "operator"].includes(role)) {
    return json({ error: "Invalid society role." }, 400);
  }

  const { data: society, error: societyError } = await adminClient
    .from("societies")
    .select("id, name")
    .eq("id", societyId)
    .maybeSingle();
  if (societyError || !society) {
    return json({ error: "The selected society was not found." }, 404);
  }

  const { data: invited, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName ?? "",
        invited_society_id: societyId,
        invited_society_role: role,
      },
      redirectTo: body.redirectTo,
    });

  if (inviteError || !invited.user) {
    const message = inviteError?.message.toLowerCase().includes("already")
      ? "This email already has a YELO account. Existing-user assignment is the next workflow."
      : inviteError?.message ?? "The invitation could not be sent.";
    return json({ error: message }, 409);
  }

  const { error: membershipError } = await adminClient
    .from("society_members")
    .insert({
      society_id: societyId,
      user_id: invited.user.id,
      role,
      is_active: true,
    });

  if (membershipError) {
    await adminClient.auth.admin.deleteUser(invited.user.id);
    return json({ error: "The membership could not be created. No invitation was retained." }, 500);
  }

  await adminClient.from("audit_logs").insert({
    society_id: societyId,
    actor_id: caller.user.id,
    action: "society_member.invited",
    entity_type: "profile",
    entity_id: invited.user.id,
    metadata: { email, role },
  });

  return json({
    invitedUserId: invited.user.id,
    societyName: society.name,
    role,
  });
});
