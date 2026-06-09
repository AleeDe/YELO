import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  MapPin,
  Plus,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cameras, incidents } from "@/lib/demo-data";
import { MetricCard, PageHeader, StatusPill } from "@/components/ui";

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tuesday, 9 June"
        title="Good morning, Ali"
        description="Review possible incidents and keep every camera healthy."
        action={
          <Link className="primary-button focus-ring" href="/cameras/register">
            <Plus size={20} aria-hidden="true" /> Register camera
          </Link>
        }
      />

      <section className="attention-banner" aria-labelledby="attention-title">
        <div className="attention-icon" aria-hidden="true"><AlertTriangle size={24} /></div>
        <div className="attention-copy">
          <p className="eyebrow">Action needed</p>
          <h2 id="attention-title">6 possible incidents need review</h2>
          <p>AI suggestions are not final decisions. Check the evidence before confirming an incident.</p>
        </div>
        <Link className="attention-action focus-ring" href="/incidents/YL-2048">
          Review newest <ArrowRight size={19} aria-hidden="true" />
        </Link>
      </section>

      <section aria-labelledby="summary-title">
        <div className="section-heading">
          <div><p className="eyebrow">Today at a glance</p><h2 id="summary-title">Monitoring summary</h2></div>
          <p className="last-updated" role="status">Updated just now</p>
        </div>
        <div className="metric-grid">
          <MetricCard label="Needs review" value="6" detail="2 added in the last hour" tone="warning" icon={AlertTriangle} />
          <MetricCard label="Cameras online" value="11/12" detail="92% available" tone="success" icon={Wifi} />
          <MetricCard label="Resolved today" value="18" detail="Median review: 1m 42s" tone="neutral" icon={CheckCircle2} />
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel incidents-panel" aria-labelledby="incidents-title">
          <div className="panel-heading">
            <div><p className="eyebrow">Human review queue</p><h2 id="incidents-title">Recent incidents</h2></div>
            <Link className="text-link focus-ring" href="/incidents">View all <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <div className="incident-list">
            {incidents.slice(0, 3).map((incident, index) => (
              <article className="incident-row" key={incident.id}>
                <div className="evidence-placeholder" aria-hidden="true"><Camera size={22} /><span>{index === 0 ? "Newest" : "Evidence"}</span></div>
                <div className="incident-main">
                  <div className="incident-title-row"><h3>{incident.object}</h3><StatusPill status={incident.status} /></div>
                  <p className="incident-camera">{incident.camera}</p>
                  <div className="incident-meta">
                    <span><MapPin size={15} aria-hidden="true" />{incident.location}</span>
                    <span><Clock3 size={15} aria-hidden="true" />{incident.time}</span>
                  </div>
                </div>
                <div className="incident-side">
                  <span className="confidence"><small>AI confidence</small><strong>{incident.confidence}%</strong></span>
                  <Link className="secondary-button focus-ring" href={`/incidents/${incident.id}`}>Review</Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel camera-panel" aria-labelledby="cameras-title">
          <div className="panel-heading">
            <div><p className="eyebrow">Live availability</p><h2 id="cameras-title">Camera health</h2></div>
            <Link className="text-link focus-ring" href="/cameras">Manage</Link>
          </div>
          <div className="health-summary">
            <div className="health-score"><span>92%</span></div>
            <div><strong>11 of 12 online</strong><p>One camera needs attention.</p></div>
          </div>
          <ul className="camera-list">
            {cameras.slice(0, 3).map((camera) => (
              <li key={camera.id}>
                <div className={`camera-state ${camera.status.toLowerCase()}`} aria-hidden="true">
                  {camera.status === "Online" ? <Wifi size={18} /> : <WifiOff size={18} />}
                </div>
                <div className="camera-copy"><strong>{camera.name}</strong><span>{camera.location}</span></div>
                <div className="camera-seen"><strong className={camera.status.toLowerCase()}>{camera.status}</strong><span>{camera.lastSeen}</span></div>
              </li>
            ))}
          </ul>
          <Link className="full-width-button focus-ring" href="/cameras">Open camera management</Link>
        </section>
      </div>
    </>
  );
}
