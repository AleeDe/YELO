import Link from "next/link";
import { Camera, CircleDot, Grid2X2, List, Plus, Search, Wifi, WifiOff } from "lucide-react";
import { cameras } from "@/lib/demo-data";
import { MetricCard, PageHeader, StatusPill } from "@/components/ui";

export default function CamerasPage() {
  return (
    <>
      <PageHeader
        eyebrow="Monitoring devices"
        title="Cameras"
        description="Register sources, monitor connection health, and configure restricted zones."
        action={<Link className="primary-button focus-ring" href="/cameras/register"><Plus size={20} /> Register camera</Link>}
      />
      <div className="metric-grid compact-metrics">
        <MetricCard label="Online" value="11" detail="Actively processing" tone="success" icon={Wifi} />
        <MetricCard label="Offline" value="1" detail="Main gate mobile" tone="warning" icon={WifiOff} />
        <MetricCard label="Active zones" value="18" detail="Across 12 cameras" tone="neutral" icon={CircleDot} />
      </div>
      <section className="panel page-panel">
        <div className="toolbar">
          <label className="search-field"><Search size={19} /><span className="sr-only">Search cameras</span><input type="search" placeholder="Search camera or location" /></label>
          <div className="view-toggle" aria-label="View layout">
            <button className="focus-ring active" aria-label="Grid view"><Grid2X2 size={18} /></button>
            <button className="focus-ring" aria-label="List view"><List size={18} /></button>
          </div>
        </div>
        <div className="camera-grid">
          {cameras.map((camera) => (
            <article className="camera-card" key={camera.id}>
              <div className="camera-preview">
                <Camera size={28} aria-hidden="true" />
                <span className={`live-indicator ${camera.status.toLowerCase()}`}>{camera.status}</span>
                <small>{camera.status === "Online" ? camera.fps : camera.lastSeen}</small>
              </div>
              <div className="camera-card-body">
                <div className="camera-card-title"><div><h2>{camera.name}</h2><p>{camera.location}</p></div><StatusPill status={camera.status} /></div>
                <dl className="camera-specs">
                  <div><dt>Source</dt><dd>{camera.type}</dd></div>
                  <div><dt>Resolution</dt><dd>{camera.resolution}</dd></div>
                  <div><dt>Zones</dt><dd>{camera.zones}</dd></div>
                </dl>
                <Link className="secondary-button focus-ring card-action" href={`/cameras/${camera.id}`}>Open camera</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

