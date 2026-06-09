"use client";

import Link from "next/link";
import { ArrowLeft, Camera, Check, Clock3, LoaderCircle, MapPin, RotateCcw, ShieldAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { StatusPill } from "@/components/ui";

type IncidentDetail = {
  id: string;
  object_class: string;
  confidence: number;
  status: string;
  detected_at: string;
  cameras: { name: string; location_label: string }[];
  restricted_zones: { name: string }[];
};

const labels: Record<string, string> = { new: "Needs review", under_review: "Under review", confirmed: "Confirmed", false_positive: "False alert", resolved: "Resolved" };

export default function IncidentDetailPage() {
  const auth = useAuth();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.client || !auth.user) return;
    const timeout = window.setTimeout(async () => {
      const id = new URLSearchParams(window.location.search).get("id");
      if (!id) {
        setLoading(false);
        return;
      }
      const { data } = await auth.client!
        .from("detection_events")
        .select("id, object_class, confidence, status, detected_at, cameras(name, location_label), restricted_zones(name)")
        .eq("id", id)
        .maybeSingle();
      setIncident(data as IncidentDetail | null);
      setLoading(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [auth.client, auth.user]);

  async function setStatus(status: "confirmed" | "false_positive" | "under_review") {
    if (!auth.client || !auth.user || !incident) return;
    setSaving(true);
    const { error } = await auth.client.from("detection_events").update({
      status,
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", incident.id);
    if (!error) setIncident({ ...incident, status });
    setSaving(false);
  }

  if (loading) return <div className="directory-state" role="status"><LoaderCircle className="spin" size={24} /><p>Loading incident...</p></div>;
  if (!incident) return <div className="directory-state"><ShieldAlert size={28} /><h1>Incident not found</h1><p>This incident does not exist or your account cannot access it.</p><Link href="/incidents" className="secondary-button focus-ring">Back to incidents</Link></div>;

  return (
    <>
      <Link href="/incidents" className="back-link focus-ring"><ArrowLeft size={18} /> Back to incidents</Link>
      <div className="detail-heading"><div><p className="eyebrow">Incident {incident.id.slice(0, 8)}</p><h1>{incident.object_class}</h1><p className="page-subtitle">Review the event evidence before recording an outcome.</p></div><StatusPill status={labels[incident.status] ?? incident.status} /></div>
      <div className="review-layout">
        <section className="panel evidence-panel">
          <div className="panel-heading"><div><p className="eyebrow">Captured evidence</p><h2>Detection frame</h2></div><span className="evidence-time"><Clock3 size={16} /> {new Date(incident.detected_at).toLocaleString()}</span></div>
          <div className="large-evidence"><Camera size={42} /><p>No evidence media has been uploaded for this event.</p></div>
        </section>
        <aside className="review-sidebar">
          <section className="panel detail-card"><h2>Event details</h2><dl className="detail-list">
            <div><dt><Camera size={16} /> Camera</dt><dd>{incident.cameras?.[0]?.name ?? "Unknown"}</dd></div>
            <div><dt><MapPin size={16} /> Location</dt><dd>{incident.cameras?.[0]?.location_label ?? "Unavailable"}</dd></div>
            <div><dt><ShieldAlert size={16} /> Zone</dt><dd>{incident.restricted_zones?.[0]?.name ?? "No zone"}</dd></div>
            <div><dt>AI confidence</dt><dd>{Math.round(Number(incident.confidence) * 100)}%</dd></div>
          </dl><div className="ai-note"><ShieldAlert size={19} /><p>This is an AI suggestion, not proof. Inspect available evidence before deciding.</p></div></section>
          <section className="panel decision-card"><div><p className="eyebrow">Record outcome</p><h2>Review decision</h2></div><div className="decision-actions">
            <button disabled={saving} onClick={() => void setStatus("confirmed")} className="decision-button confirm focus-ring"><Check size={20} /><span><strong>Confirm incident</strong><small>Evidence supports littering</small></span></button>
            <button disabled={saving} onClick={() => void setStatus("false_positive")} className="decision-button reject focus-ring"><X size={20} /><span><strong>Mark false alert</strong><small>No actionable incident</small></span></button>
            <button disabled={saving} onClick={() => void setStatus("under_review")} className="decision-button neutral focus-ring"><RotateCcw size={20} /><span><strong>Keep under review</strong><small>More context is required</small></span></button>
          </div></section>
        </aside>
      </div>
    </>
  );
}
