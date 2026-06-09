import Link from "next/link";
import { AlertTriangle, ArrowRight, Camera, CheckCircle2, Clock3, MapPin, PlayCircle, Wifi } from "lucide-react";
import { incidents } from "@/lib/demo-data";
import { MetricCard, PageHeader, StatusPill } from "@/components/ui";

export default function OperatorPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operator workspace"
        title="My review queue"
        description="Review the oldest incident first and keep the monitoring queue moving."
        action={<Link className="primary-button focus-ring" href="/incidents/YL-2048"><PlayCircle size={20} /> Start reviewing</Link>}
      />
      <div className="metric-grid compact-metrics">
        <MetricCard label="Assigned to me" value="6" detail="2 are less than 10 minutes old" tone="warning" icon={AlertTriangle} />
        <MetricCard label="Reviewed today" value="14" detail="92% agreement with admins" tone="success" icon={CheckCircle2} />
        <MetricCard label="Cameras monitored" value="4" detail="All assigned cameras online" tone="neutral" icon={Wifi} />
      </div>

      <div className="operator-grid">
        <section className="panel queue-panel">
          <div className="panel-heading"><div><p className="eyebrow">Priority order</p><h2>Incidents needing review</h2></div><Link href="/incidents" className="text-link focus-ring">Full queue <ArrowRight size={17} /></Link></div>
          <div className="operator-queue">
            {incidents.slice(0, 4).map((incident, index) => (
              <article key={incident.id} className={index === 0 ? "priority" : ""}>
                <span className="queue-number">{index + 1}</span>
                <div className="queue-evidence"><Camera size={22} /><small>{incident.confidence}%</small></div>
                <div className="queue-copy"><div><h3>{incident.object}</h3><StatusPill status={incident.status} /></div><p>{incident.camera}</p><span><MapPin size={14} /> {incident.location}</span></div>
                <div className="queue-time"><Clock3 size={15} /><span>{incident.time}</span></div>
                <Link href={`/incidents/${incident.id}`} className="secondary-button focus-ring">Review</Link>
              </article>
            ))}
          </div>
        </section>
        <aside className="operator-side">
          <section className="panel shift-card">
            <p className="eyebrow">Current shift</p><h2>Review progress</h2>
            <div className="shift-progress"><div><strong>14</strong><span>reviewed</span></div><div><strong>6</strong><span>remaining</span></div></div>
            <div className="progress-track"><span style={{ width: "70%" }} /></div>
            <p>70% of today’s assigned queue is complete.</p>
          </section>
          <section className="panel assigned-cameras">
            <div className="panel-heading"><div><p className="eyebrow">My monitoring</p><h2>Assigned cameras</h2></div></div>
            {["Park north entrance", "Market street 02", "Playground west", "Main gate mobile"].map((camera) => <div className="assigned-camera" key={camera}><span className="service-icon online"><Camera size={17} /></span><div><strong>{camera}</strong><small>Online · Processing</small></div><StatusPill status="Online" /></div>)}
            <Link href="/cameras" className="full-width-button focus-ring">Open camera view</Link>
          </section>
        </aside>
      </div>
    </>
  );
}
