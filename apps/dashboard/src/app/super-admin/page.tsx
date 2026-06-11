"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  CircleDot,
  LoaderCircle,
  Plus,
  Settings,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader, StatusPill } from "@/components/ui";

type SocietySummary = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  cameras: { count: number }[];
  society_members: { count: number }[];
  detection_events: { count: number }[];
};

type PlatformSnapshot = {
  societies: SocietySummary[];
  cameras: number;
  online: number;
  incidents: number;
  users: number;
};

const emptySnapshot: PlatformSnapshot = {
  societies: [],
  cameras: 0,
  online: 0,
  incidents: 0,
  users: 0,
};

export default function SuperAdminPage() {
  const auth = useAuth();
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.client || !auth.user) return;
    const timeout = window.setTimeout(async () => {
      const client = auth.client!;
      const [societies, cameras, online, incidents, users] = await Promise.all([
        client.from("societies").select("id, name, is_active, created_at, cameras(count), society_members(count), detection_events(count)").order("created_at", { ascending: false }),
        client.from("cameras").select("*", { count: "exact", head: true }),
        client.from("cameras").select("*", { count: "exact", head: true }).eq("status", "online"),
        client.from("detection_events").select("*", { count: "exact", head: true }).in("status", ["new", "under_review"]),
        client.from("profiles").select("*", { count: "exact", head: true }),
      ]);
      const firstError = societies.error ?? cameras.error ?? online.error ?? incidents.error ?? users.error;
      setError(firstError?.message ?? "");
      setSnapshot({
        societies: (societies.data ?? []) as SocietySummary[],
        cameras: cameras.count ?? 0,
        online: online.count ?? 0,
        incidents: incidents.count ?? 0,
        users: users.count ?? 0,
      });
      setLoading(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [auth.client, auth.user]);

  const attention = useMemo(() => {
    const missingMembers = snapshot.societies.filter(
      (society) => (society.society_members?.[0]?.count ?? 0) === 0,
    ).length;
    const inactive = snapshot.societies.filter((society) => !society.is_active).length;
    return {
      missingMembers,
      inactive,
      offline: Math.max(snapshot.cameras - snapshot.online, 0),
      total: missingMembers + inactive + Math.max(snapshot.cameras - snapshot.online, 0) + snapshot.incidents,
    };
  }, [snapshot]);

  const availability = snapshot.cameras
    ? Math.round((snapshot.online / snapshot.cameras) * 100)
    : 0;

  return (
    <>
      <PageHeader
        eyebrow="Platform command center"
        title="YELO platform"
        description="Govern societies, access, and platform-wide service health without entering a society workspace."
        action={<Link className="primary-button focus-ring" href="/super-admin/societies"><Plus size={20} /> Create society</Link>}
      />

      <section className={`control-brief ${attention.total ? "needs-attention" : "healthy"}`} aria-labelledby="platform-brief-title">
        <span className="control-brief-icon" aria-hidden="true">{attention.total ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}</span>
        <div>
          <p className="eyebrow">Platform brief</p>
          <h2 id="platform-brief-title">{loading ? "Checking platform state" : attention.total ? `${attention.total} items need platform attention` : "Platform setup is healthy"}</h2>
          <p>{loading ? "Collecting organization, camera, and incident status." : "Prioritize tenant onboarding and broad service conditions before reviewing local operations."}</p>
        </div>
        <Link href="#attention-queue" className="control-brief-action focus-ring">Review priorities <ArrowRight size={18} /></Link>
      </section>

      {error && <div className="page-feedback" role="alert"><AlertTriangle size={19} /><span>{error}</span></div>}

      <section aria-labelledby="platform-snapshot-title">
        <div className="section-heading"><div><p className="eyebrow">At a glance</p><h2 id="platform-snapshot-title">Platform snapshot</h2></div><span className="freshness-label"><CircleDot size={14} /> Live from Supabase</span></div>
        <div className="control-metrics" aria-busy={loading}>
          <article><span className="control-metric-icon organizations"><Building2 size={21} /></span><div><small>Organizations</small><strong>{loading ? "..." : snapshot.societies.length}</strong><p>{snapshot.societies.filter((society) => society.is_active).length} active societies</p></div><Link href="/super-admin/societies" aria-label="Open societies"><ArrowRight size={18} /></Link></article>
          <article><span className="control-metric-icon cameras"><Camera size={21} /></span><div><small>Camera fleet</small><strong>{loading ? "..." : snapshot.cameras}</strong><p>{availability}% currently online</p></div><Link href="/cameras" aria-label="Open cameras"><ArrowRight size={18} /></Link></article>
          <article><span className="control-metric-icon review"><AlertTriangle size={21} /></span><div><small>Review backlog</small><strong>{loading ? "..." : snapshot.incidents}</strong><p>Across every society</p></div><Link href="/incidents" aria-label="Open incidents"><ArrowRight size={18} /></Link></article>
          <article><span className="control-metric-icon access"><Users size={21} /></span><div><small>User profiles</small><strong>{loading ? "..." : snapshot.users}</strong><p>Platform-wide identities</p></div><Link href="/members" aria-label="Open users"><ArrowRight size={18} /></Link></article>
        </div>
      </section>

      <div className="control-layout">
        <section className="panel attention-queue" id="attention-queue">
          <div className="panel-heading"><div><p className="eyebrow">Priority order</p><h2>Platform attention</h2></div><span className="queue-summary">{attention.total} open</span></div>
          {loading ? <div className="directory-state"><LoaderCircle className="spin" size={24} /><p>Building priority queue...</p></div> : (
            <div className="attention-items">
              <Link href="/super-admin/societies" className="attention-item focus-ring"><span className={`attention-rank ${attention.missingMembers ? "warning" : "complete"}`}>{attention.missingMembers ? "1" : <CheckCircle2 size={18} />}</span><div><strong>Complete society onboarding</strong><p>{attention.missingMembers} societies have no assigned member</p></div><span className="attention-value">{attention.missingMembers}</span><ArrowRight size={18} /></Link>
              <Link href="/cameras" className="attention-item focus-ring"><span className={`attention-rank ${attention.offline ? "warning" : "complete"}`}>{attention.offline ? "2" : <CheckCircle2 size={18} />}</span><div><strong>Restore camera availability</strong><p>{attention.offline} registered cameras are not online</p></div><span className="attention-value">{attention.offline}</span><ArrowRight size={18} /></Link>
              <Link href="/incidents" className="attention-item focus-ring"><span className={`attention-rank ${snapshot.incidents ? "warning" : "complete"}`}>{snapshot.incidents ? "3" : <CheckCircle2 size={18} />}</span><div><strong>Monitor review backlog</strong><p>{snapshot.incidents} events await a human outcome</p></div><span className="attention-value">{snapshot.incidents}</span><ArrowRight size={18} /></Link>
            </div>
          )}
        </section>

        <aside className="control-side">
          <section className="panel fleet-health">
            <div className="panel-heading"><div><p className="eyebrow">Infrastructure</p><h2>Fleet health</h2></div><StatusPill status={attention.offline ? "Needs review" : "Online"} /></div>
            <div className="availability-ring" style={{ "--availability": `${availability * 3.6}deg` } as React.CSSProperties}><div><strong>{availability}%</strong><span>online</span></div></div>
            <dl className="fleet-stats"><div><dt><Wifi size={16} /> Online</dt><dd>{snapshot.online}</dd></div><div><dt><WifiOff size={16} /> Not online</dt><dd>{attention.offline}</dd></div><div><dt><Camera size={16} /> Total</dt><dd>{snapshot.cameras}</dd></div></dl>
          </section>
          <section className="panel quick-command">
            <p className="eyebrow">Direct actions</p><h2>Platform controls</h2>
            <Link href="/super-admin/societies" className="command-button focus-ring"><span><Building2 size={19} /></span><div><strong>Manage societies</strong><small>Create and monitor tenants</small></div><ArrowRight size={18} /></Link>
            <Link href="/members" className="command-button focus-ring"><span><UserPlus size={19} /></span><div><strong>Review access</strong><small>View platform identities</small></div><ArrowRight size={18} /></Link>
            <Link href="/super-admin/settings" className="command-button focus-ring"><span><Settings size={19} /></span><div><strong>Platform policy</strong><small>Security and governance</small></div><ArrowRight size={18} /></Link>
          </section>
        </aside>
      </div>

      <section className="panel tenant-portfolio">
        <div className="panel-heading"><div><p className="eyebrow">Organization portfolio</p><h2>Society readiness</h2></div><Link href="/super-admin/societies" className="text-link focus-ring">All societies <ArrowRight size={17} /></Link></div>
        {snapshot.societies.length === 0 && !loading ? <div className="directory-state"><Building2 size={28} /><h2>No societies yet</h2><p>Create the first organization workspace to begin onboarding.</p></div> : <div className="portfolio-grid">{snapshot.societies.slice(0, 6).map((society) => {
          const cameras = society.cameras?.[0]?.count ?? 0;
          const members = society.society_members?.[0]?.count ?? 0;
          const incidents = society.detection_events?.[0]?.count ?? 0;
          return <article key={society.id}>
            <div className="portfolio-heading"><span>{society.name.split(" ").map((word) => word[0]).join("").slice(0, 2)}</span><StatusPill status={society.is_active && members ? "Active" : "Needs review"} /></div>
            <h3>{society.name}</h3><p>{members ? `${members} members assigned` : "Administrator assignment needed"}</p>
            <dl><div><dt>Cameras</dt><dd>{cameras}</dd></div><div><dt>Events</dt><dd>{incidents}</dd></div></dl>
          </article>;
        })}</div>}
      </section>
    </>
  );
}
