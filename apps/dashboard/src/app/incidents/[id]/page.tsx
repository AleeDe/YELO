import Link from "next/link";
import { ArrowLeft, Camera, Check, Clock3, MapPin, MessageSquareText, RotateCcw, ShieldAlert, X } from "lucide-react";
import { incidents } from "@/lib/demo-data";
import { StatusPill } from "@/components/ui";

export function generateStaticParams() {
  return incidents.map((incident) => ({ id: incident.id }));
}

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = incidents.find((item) => item.id === id) ?? incidents[0];
  return (
    <>
      <Link href="/incidents" className="back-link focus-ring"><ArrowLeft size={18} /> Back to incidents</Link>
      <div className="detail-heading">
        <div><p className="eyebrow">Incident {incident.id}</p><h1>{incident.object}</h1><p className="page-subtitle">Review the event evidence before recording an outcome.</p></div>
        <StatusPill status={incident.status} />
      </div>
      <div className="review-layout">
        <section className="panel evidence-panel" aria-labelledby="evidence-title">
          <div className="panel-heading"><div><p className="eyebrow">Captured evidence</p><h2 id="evidence-title">Detection frame</h2></div><span className="evidence-time"><Clock3 size={16} /> {incident.date}</span></div>
          <div className="large-evidence">
            <div className="detection-box"><span>{incident.object} · {incident.confidence}%</span></div>
            <div className="zone-line"><span>Restricted zone</span></div>
            <Camera size={42} aria-hidden="true" />
            <p>Evidence image placeholder</p>
          </div>
          <div className="timeline-strip">
            {["Before", "Detection", "After"].map((label, index) => <button className={`timeline-frame focus-ring ${index === 1 ? "selected" : ""}`} key={label}><Camera size={18} /><span>{label}</span></button>)}
          </div>
        </section>
        <aside className="review-sidebar">
          <section className="panel detail-card">
            <h2>Event details</h2>
            <dl className="detail-list">
              <div><dt><Camera size={16} /> Camera</dt><dd>{incident.camera}</dd></div>
              <div><dt><MapPin size={16} /> Location</dt><dd>{incident.location}</dd></div>
              <div><dt><ShieldAlert size={16} /> Zone</dt><dd>{incident.zone}</dd></div>
              <div><dt>AI confidence</dt><dd>{incident.confidence}%</dd></div>
            </dl>
            <div className="ai-note"><ShieldAlert size={19} /><p>This is an AI suggestion. Confidence is not proof; inspect the evidence and context.</p></div>
          </section>
          <section className="panel decision-card">
            <div><p className="eyebrow">Record outcome</p><h2>Review decision</h2></div>
            <div className="decision-actions">
              <button className="decision-button confirm focus-ring"><Check size={20} /><span><strong>Confirm incident</strong><small>Evidence supports littering</small></span></button>
              <button className="decision-button reject focus-ring"><X size={20} /><span><strong>Mark false alert</strong><small>No actionable incident</small></span></button>
              <button className="decision-button neutral focus-ring"><RotateCcw size={20} /><span><strong>Keep under review</strong><small>More context is required</small></span></button>
            </div>
            <label className="form-field"><span><MessageSquareText size={16} /> Review notes</span><textarea rows={3} placeholder="Add context for other operators" /></label>
          </section>
        </aside>
      </div>
    </>
  );
}
