"use client";

import Link from "next/link";
import { AlertTriangle, Camera, CheckCircle2, LoaderCircle, Plus, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { MetricCard, PageHeader } from "@/components/ui";

export default function OverviewPage() {
  const auth = useAuth();
  const [values, setValues] = useState({ review: 0, cameras: 0, online: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.client || !auth.user) return;
    const timeout = window.setTimeout(async () => {
      const client = auth.client!;
      const [review, cameras, online, resolved] = await Promise.all([
        client.from("detection_events").select("*", { count: "exact", head: true }).in("status", ["new", "under_review"]),
        client.from("cameras").select("*", { count: "exact", head: true }),
        client.from("cameras").select("*", { count: "exact", head: true }).eq("status", "online"),
        client.from("detection_events").select("*", { count: "exact", head: true }).in("status", ["confirmed", "false_positive", "resolved"]),
      ]);
      setValues({ review: review.count ?? 0, cameras: cameras.count ?? 0, online: online.count ?? 0, resolved: resolved.count ?? 0 });
      setLoading(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [auth.client, auth.user]);

  return <>
    <PageHeader eyebrow="Society workspace" title={`Welcome, ${auth.user?.user_metadata.full_name || auth.user?.email?.split("@")[0] || "user"}`} description="Monitor real camera and incident activity for societies you can access." action={<Link className="primary-button focus-ring" href="/cameras/register"><Plus size={20} /> Register camera</Link>} />
    <div className="metric-grid">
      <MetricCard label="Needs review" value={loading ? "—" : String(values.review)} detail="AI events awaiting a decision" tone="warning" icon={AlertTriangle} />
      <MetricCard label="Cameras online" value={loading ? "—" : `${values.online}/${values.cameras}`} detail="Connected monitoring sources" tone="success" icon={Wifi} />
      <MetricCard label="Completed reviews" value={loading ? "—" : String(values.resolved)} detail="All recorded outcomes" tone="neutral" icon={CheckCircle2} />
    </div>
    <section className="panel">
      {loading ? <div className="directory-state"><LoaderCircle className="spin" size={24} /><p>Loading workspace...</p></div>
      : values.cameras === 0 ? <div className="empty-state"><div className="empty-icon"><Camera size={26} /></div><h2>No monitoring data yet</h2><p>Register a camera first. Real incidents and analytics will appear after detection events are received.</p><Link href="/cameras/register" className="secondary-button focus-ring">Register camera</Link></div>
      : <div className="admin-actions"><h2>Workspace data is ready</h2><Link href="/cameras" className="action-row focus-ring"><Camera size={19} /><span><strong>Open cameras</strong><small>View live database records</small></span></Link><Link href="/incidents" className="action-row focus-ring"><AlertTriangle size={19} /><span><strong>Review incidents</strong><small>Open the human review queue</small></span></Link></div>}
    </section>
  </>;
}
