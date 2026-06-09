import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AppRole } from "@/components/auth-provider";

export async function resolveUserAccess(
  client: SupabaseClient,
  user: User,
): Promise<{ role: AppRole; societyId: string | null }> {
  const { data: profile } = await client
    .from("profiles")
    .select("platform_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.platform_role === "super_admin") {
    return { role: "super_admin", societyId: null };
  }

  const { data: membership } = await client
    .from("society_members")
    .select("society_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return {
    role: membership?.role === "operator" ? "operator" : "society_admin",
    societyId: membership?.society_id ?? null,
  };
}

