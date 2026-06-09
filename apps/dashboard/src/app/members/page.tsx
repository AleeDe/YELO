"use client";

import { LoaderCircle, Search, ShieldCheck, UserCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { MetricCard, PageHeader, StatusPill } from "@/components/ui";

type ProfileRow = {
  id: string;
  full_name: string;
  platform_role: string;
  society_members: { role: string; is_active: boolean }[];
};

export default function MembersPage() {
  const auth = useAuth();
  const [members, setMembers] = useState<ProfileRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.client || !auth.user) return;
    const timeout = window.setTimeout(async () => {
      const { data, error: loadError } = await auth.client!
        .from("profiles")
        .select("id, full_name, platform_role, society_members(role, is_active)")
        .order("created_at");
      setMembers((data ?? []) as ProfileRow[]);
      setError(loadError?.message ?? "");
      setLoading(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [auth.client, auth.user]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? members.filter((member) => member.full_name.toLowerCase().includes(value)) : members;
  }, [members, query]);

  const active = members.filter((member) =>
    member.platform_role === "super_admin" || member.society_members.some((membership) => membership.is_active),
  ).length;

  return (
    <>
      <PageHeader eyebrow="Access management" title="Members" description="View users who can access platform or society data." />
      <div className="metric-grid compact-metrics">
        <MetricCard label="Total members" value={String(members.length)} detail="Profiles visible to your role" tone="neutral" icon={Users} />
        <MetricCard label="Active access" value={String(active)} detail="Enabled platform or society access" tone="success" icon={UserCheck} />
        <MetricCard label="Invitations" value="0" detail="Invitation workflow is next" tone="neutral" icon={ShieldCheck} />
      </div>
      <section className="panel page-panel" aria-busy={loading}>
        <div className="toolbar"><label className="search-field"><Search size={19} /><span className="sr-only">Search members</span><input type="search" placeholder="Search member name" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
        {loading ? <div className="directory-state" role="status"><LoaderCircle className="spin" size={24} /><p>Loading members...</p></div>
        : error ? <div className="directory-state error" role="alert"><p>{error}</p></div>
        : filtered.length === 0 ? <div className="directory-state"><Users size={28} /><h2>No members found</h2><p>Invited society administrators and operators will appear here.</p></div>
        : <div className="member-list">{filtered.map((member) => {
          const membership = member.society_members[0];
          const role = member.platform_role === "super_admin" ? "Super administrator" : membership?.role === "society_admin" ? "Society administrator" : membership?.role === "operator" ? "Operator" : "No society role";
          const initials = (member.full_name || "User").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
          return <article className="member-row" key={member.id}>
            <span className="member-avatar" aria-hidden="true">{initials}</span>
            <div className="member-identity"><strong>{member.full_name || "Unnamed user"}</strong><span>{member.id.slice(0, 8)}</span></div>
            <div className="member-role"><ShieldCheck size={17} /><span>{role}</span></div>
            <StatusPill status={member.platform_role === "super_admin" || membership?.is_active ? "Active" : "Needs review"} />
          </article>;
        })}</div>}
      </section>
    </>
  );
}
