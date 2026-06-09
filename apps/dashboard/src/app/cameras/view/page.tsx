"use client";

import Link from "next/link";
import { ArrowLeft, Camera, Clock3, LoaderCircle, MapPin, ShieldCheck, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { StatusPill } from "@/components/ui";

type CameraDetail = {
  id: string;
  name: string;
  location_label: string;
  source_type: string;
  status: string;
  detection_enabled: boolean;
  confidence_threshold: number;
  confirmation_seconds: number;
  last_seen_at: string | null;
  restricted_zones: { id: string; name: string; is_active: boolean }[];
};

export default function CameraDetailPage() {
  const auth = useAuth();
  const [camera, setCamera] = useState<CameraDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.client || !auth.user) return;
    const timeout = window.setTimeout(async () => {
      const id = new URLSearchParams(window.location.search).get("id");
      if (!id) {
        setLoading(false);
        return;
      }
      const { data } = await auth.client!
        .from("cameras")
        .select("id, name, location_label, source_type, status, detection_enabled, confidence_threshold, confirmation_seconds, last_seen_at, restricted_zones(id, name, is_active)")
        .eq("id", id)
        .maybeSingle();
      setCamera(data as CameraDetail | null);
      setLoading(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [auth.client, auth.user]);

  if (loading) return <div className="directory-state" role="status"><LoaderCircle className="spin" size={24} /><p>Loading camera...</p></div>;
  if (!camera) return <div className="directory-state"><Camera size={28} /><h1>Camera not found</h1><p>This camera does not exist or your account cannot access it.</p><Link href="/cameras" className="secondary-button focus-ring">Back to cameras</Link></div>;

  const status = camera.status[0].toUpperCase() + camera.status.slice(1);
  return (
    <>
      <Link href="/cameras" className="back-link focus-ring"><ArrowLeft size={18} /> Back to cameras</Link>
      <div className="detail-heading">
        <div><p className="eyebrow">{camera.id.slice(0, 8)}</p><h1>{camera.name}</h1><p className="page-subtitle">{camera.location_label} · {camera.source_type}</p></div>
        <StatusPill status={status} />
      </div>
      <div className="camera-detail-grid">
        <section className="panel live-panel">
          <div className="panel-heading"><div><p className="eyebrow">Camera source</p><h2>Preview</h2></div></div>
          <div className="live-preview"><Camera size={48} /><p>Live preview will appear after the camera device connects.</p></div>
        </section>
        <aside className="camera-info-stack">
          <section className="panel detail-card"><h2>Connection health</h2><dl className="detail-list">
            <div><dt><Wifi size={16} /> Status</dt><dd>{status}</dd></div>
            <div><dt><Camera size={16} /> Source</dt><dd>{camera.source_type}</dd></div>
            <div><dt><Clock3 size={16} /> Last contact</dt><dd>{camera.last_seen_at ? new Date(camera.last_seen_at).toLocaleString() : "Never"}</dd></div>
          </dl></section>
          <section className="panel detail-card"><h2>Detection</h2><dl className="detail-list">
            <div><dt>Enabled</dt><dd>{camera.detection_enabled ? "Yes" : "No"}</dd></div>
            <div><dt>Confidence threshold</dt><dd>{Math.round(Number(camera.confidence_threshold) * 100)}%</dd></div>
            <div><dt>Confirmation delay</dt><dd>{camera.confirmation_seconds} seconds</dd></div>
          </dl></section>
        </aside>
      </div>
      <section className="panel zones-section">
        <div className="panel-heading"><div><p className="eyebrow">Monitored areas</p><h2>Restricted zones</h2></div></div>
        {camera.restricted_zones.length === 0 ? <div className="directory-state"><ShieldCheck size={28} /><h2>No restricted zones</h2><p>Add zone drawing support after the camera connection workflow.</p></div>
        : <div className="zone-cards">{camera.restricted_zones.map((zone) => <article key={zone.id}><div className="zone-icon"><ShieldCheck size={21} /></div><div><h3>{zone.name}</h3><p><MapPin size={14} /> Detection area</p></div><StatusPill status={zone.is_active ? "Active" : "Needs review"} /></article>)}</div>}
      </section>
    </>
  );
}
