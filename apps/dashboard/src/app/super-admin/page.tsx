"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Building2, Camera, CheckCircle2, LoaderCircle, Plus, ServerCog, Users, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { MetricCard, PageHeader, StatusPill } from "@/components/ui";

type SocietySummary = {
  id: string;
  name: string;
  is_active: boolean;
  cameras: { count: number }[];
  society_members: { count: number }[];
  detection_events: { count: number }[];
};

export default function SuperAdminPage() {
  const auth = useAuth();
  const [societies, setSocieties] = useState<SocietySummary[]>([]);
  const [cameraCount, setCameraCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.client || !auth.user) return;
    const timeout = window.setTimeout(async () => {
      const client = auth.client!;
      const [societiesResult, camerasResult, onlineResult, incidentsResult, usersResult] =
        await Promise.all([
          client.from("societies").select("id, name, is_active, cameras(count), society_members(count), detection_events(count)").order("created_at", { ascending: false }),
          client.from("cameras").select("*", { count: "exact", head: true }),
          client.from("cameras").select("*", { count: "exact", head: true }).eq("status", "online"),
          client.from("detection_events").select("*", { count: "exact", head: true }).in("status", ["new", "under_review"]),
          client.from("profiles").select("*", { count: "exact", head: true }),
        ]);

      const firstError = societiesResult.error ?? camerasResult.error ?? onlineResult.error ?? incidentsResult.error ?? usersResult.error;
      setError(firstError?.message ?? "");
      setSocieties((societiesResult.data ?? []) as SocietySummary[]);
      setCameraCount(camerasResult.count ?? 0);
      setOnlineCount(onlineResult.count ?? 0);
      setIncidentCount(incidentsResult.count ?? 0);
      setUserCount(usersResult.count ?? 0);
      setLoading(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [auth.client, auth.user]);

  return (
    <>
      <PageHeader eyebrow="Platform administration" title="Platform overview" description="Monitor every society, camera, administrator, and AI processing service." action={<Link className="primary-button focus-ring" href="/super-admin/societies"><Plus size={20} /> Add society</Link>} />
      <div className="metric-grid analytics-metrics" aria-busy={loading}>
        <MetricCard label="Active societies" value={loading ? "—" : String(societies.filter((society) => society.is_active).length)} detail={`${societies.length} total workspaces`} tone="success" icon={Building2} />
        <MetricCard label="Registered cameras" value={loading ? "—" : String(cameraCount)} detail={`${onlineCount} currently online`} tone="neutral" icon={Camera} />
        <MetricCard label="Needs review" value={loading ? "—" : String(incidentCount)} detail="New and under-review incidents" tone="warning" icon={AlertTriangle} />
        <MetricCard label="User profiles" value={loading ? "—" : String(userCount)} detail="Platform and society users" tone="success" icon={Users} />
      </div>

      {error && <div className="page-feedback" role="alert"><AlertTriangle size={19} /><span>{error}</span></div>}

      <div className="platform-grid">
        <section className="panel platform-societies">
          <div className="panel-heading"><div><p className="eyebrow">Tenant health</p><h2>Societies</h2></div><Link href="/super-admin/societies" className="text-link focus-ring">Manage all <ArrowRight size={17} /></Link></div>
          {loading ? <div className="directory-state" role="status"><LoaderCircle className="spin" size={24} /><p>Loading platform data...</p></div>
          : societies.length === 0 ? <div className="directory-state"><Building2 size={28} /><h2>No societies yet</h2><p>Create the first tenant workspace to begin registering cameras and members.</p></div>
          : <div className="society-health-list">{societies.slice(0, 5).map((society) => {
            const cameras = society.cameras?.[0]?.count ?? 0;
            const incidents = society.detection_events?.[0]?.count ?? 0;
            const members = society.society_members?.[0]?.count ?? 0;
            return <article key={society.id}>
              <span className="society-avatar large" aria-hidden="true">{society.name.split(" ").map((word) => word[0]).join("").slice(0, 2)}</span>
              <div><h3>{society.name}</h3><p>{members} members</p></div>
              <div className="society-stat"><small>Cameras</small><strong>{cameras}</strong></div>
              <div className="society-stat"><small>Incidents</small><strong>{incidents}</strong></div>
              <StatusPill status={society.is_active ? "Active" : "Needs review"} />
              <Link href="/super-admin/societies" className="table-action focus-ring">Open</Link>
            </article>;
          })}</div>}
        </section>

        <aside className="platform-side">
          <section className="panel service-health">
            <div className="panel-heading"><div><p className="eyebrow">Infrastructure</p><h2>Service health</h2></div><CheckCircle2 className="healthy-icon" size={23} /></div>
            <ul>
              <li><span className="service-icon online"><ServerCog size={18} /></span><div><strong>Supabase backend</strong><small>Connected</small></div><StatusPill status="Online" /></li>
              <li><span className="service-icon online"><Wifi size={18} /></span><div><strong>Online cameras</strong><small>{onlineCount} connected devices</small></div><StatusPill status={onlineCount > 0 ? "Online" : "Needs review"} /></li>
              <li><span className="service-icon warning"><WifiOff size={18} /></span><div><strong>Offline cameras</strong><small>{Math.max(cameraCount - onlineCount, 0)} devices</small></div><StatusPill status={cameraCount - onlineCount > 0 ? "Needs review" : "Online"} /></li>
            </ul>
          </section>
          <section className="panel admin-actions">
            <p className="eyebrow">Common tasks</p><h2>Platform actions</h2>
            <Link href="/super-admin/societies" className="action-row focus-ring"><Building2 size={19} /><span><strong>Create society</strong><small>Set up a new tenant workspace</small></span><ArrowRight size={17} /></Link>
            <Link href="/members" className="action-row focus-ring"><Users size={19} /><span><strong>View users</strong><small>Review current platform access</small></span><ArrowRight size={17} /></Link>
          </section>
        </aside>
      </div>
    </>
  );
}
