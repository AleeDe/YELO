"use client";

import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { MetricCard, PageHeader } from "@/components/ui";

export default function AnalyticsPage() {
  const auth = useAuth();
  const [counts, setCounts] = useState({ total: 0, confirmed: 0, falsePositive: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!auth.client || !auth.user) return;
    const timeout = window.setTimeout(async () => {
      const { data } = await auth.client!.from("detection_events").select("status");
      const rows = data ?? [];
      setCounts({
        total: rows.length,
        confirmed: rows.filter((row) => row.status === "confirmed").length,
        falsePositive: rows.filter((row) => row.status === "false_positive").length,
        pending: rows.filter((row) => ["new", "under_review"].includes(row.status)).length,
      });
      setLoading(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [auth.client, auth.user]);
  const falseRate = counts.total ? Math.round((counts.falsePositive / counts.total) * 100) : 0;
  return <>
    <PageHeader eyebrow="Performance insights" title="Analytics" description="Metrics calculated from detection events currently stored in Supabase." />
    <div className="metric-grid analytics-metrics">
      <MetricCard label="Possible incidents" value={loading ? "—" : String(counts.total)} detail="All accessible events" tone="warning" icon={AlertTriangle} />
      <MetricCard label="Confirmed" value={loading ? "—" : String(counts.confirmed)} detail="Human-confirmed incidents" tone="success" icon={CheckCircle2} />
      <MetricCard label="Pending review" value={loading ? "—" : String(counts.pending)} detail="New or under review" tone="neutral" icon={Clock3} />
      <MetricCard label="False-alert rate" value={loading ? "—" : `${falseRate}%`} detail="Based on reviewed events" tone="warning" icon={TrendingDown} />
    </div>
    <section className="panel">{loading ? <div className="directory-state"><LoaderCircle className="spin" size={24} /><p>Calculating analytics...</p></div> : <div className="empty-state"><h2>{counts.total ? "Analytics connected" : "No event history yet"}</h2><p>{counts.total ? "Charts will become useful as more detection events are collected." : "Real analytics will appear after connected cameras create detection events."}</p></div>}</section>
  </>;
}
