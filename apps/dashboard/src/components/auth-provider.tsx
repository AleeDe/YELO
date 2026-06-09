"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { resolveUserAccess } from "@/lib/supabase/access";

export type AppRole = "super_admin" | "society_admin" | "operator";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  role: AppRole | null;
  societyId: string | null;
  client: SupabaseClient | null;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<AppRole | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function destinationForRole(role: AppRole | null) {
  if (role === "super_admin") return "/super-admin";
  if (role === "operator") return "/operator";
  return "/";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [client] = useState<SupabaseClient | null>(() =>
    isSupabaseConfigured ? createClient() : null,
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [societyId, setSocietyId] = useState<string | null>(null);

  const loadRole = useCallback(async (currentUser: User): Promise<AppRole> => {
    if (!client) return "society_admin";
    const access = await resolveUserAccess(client, currentUser);
    setSocietyId(access.societyId);
    setRole(access.role);
    return access.role;
  }, [client]);

  const refreshRole = useCallback(async () => {
    if (!user) return null;
    return loadRole(user);
  }, [loadRole, user]);

  useEffect(() => {
    if (!client) return;

    let active = true;
    client.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      setUser(data.user);
      if (data.user) await loadRole(data.user);
      setLoading(false);
    });

    const { data: subscription } = client.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          const currentUser = session.user;
          window.setTimeout(() => {
            if (active) void loadRole(currentUser);
          }, 0);
        } else {
          setRole(null);
          setSocietyId(null);
        }
        setLoading(false);
      },
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [client, loadRole]);

  useEffect(() => {
    if (!isSupabaseConfigured || loading) return;
    const isPublicRoute =
      pathname.startsWith("/auth") || pathname.startsWith("/capture");
    if (!user && !isPublicRoute) {
      router.replace(`/auth/sign-in?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, pathname, router, user]);

  useEffect(() => {
    if (!isSupabaseConfigured || loading || !user || !role) return;
    if (role === "super_admin" && pathname === "/settings") {
      router.replace("/super-admin/settings");
    } else if (pathname.startsWith("/super-admin") && role !== "super_admin") {
      router.replace(destinationForRole(role));
    } else if (pathname.startsWith("/operator") && role !== "operator") {
      router.replace(destinationForRole(role));
    }
  }, [loading, pathname, role, router, user]);

  const signOut = useCallback(async () => {
    if (!client) return;
    await client.auth.signOut();
    router.replace("/auth/sign-in");
  }, [client, router]);

  const value = useMemo(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      user,
      role,
      societyId,
      client,
      signOut,
      refreshRole,
    }),
    [client, loading, refreshRole, role, signOut, societyId, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}

export { destinationForRole };
