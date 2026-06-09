import Link from "next/link";
import { ArrowLeft, Camera, CircleDot, Clock3, MapPin, Pause, Pencil, Settings2, ShieldCheck, Signal, Wifi } from "lucide-react";
import { cameras } from "@/lib/demo-data";
import { StatusPill } from "@/components/ui";

export function generateStaticParams() {
  return cameras.map((camera) => ({ id: camera.id }));
}

export default async function CameraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const camera = cameras.find((item) => item.id === id) ?? cameras[0];
  return (
    <>
      <Link href="/cameras" className="back-link focus-ring"><ArrowLeft size={18} /> Back to cameras</Link>
      <div className="detail-heading">
        <div><p className="eyebrow">{camera.id}</p><h1>{camera.name}</h1><p className="page-subtitle">{camera.location} · {camera.type}</p></div>
        <div className="heading-actions"><StatusPill status={camera.status} /><button className="secondary-button focus-ring"><Pencil size={17} /> Edit</button></div>
      </div>
      <div className="camera-detail-grid">
        <section className="panel live-panel">
          <div className="panel-heading"><div><p className="eyebrow">Live monitoring</p><h2>Camera preview</h2></div><span className="live-chip"><span /> Live · {camera.fps}</span></div>
          <div className="live-preview">
            <div className="restricted-polygon"><span>Restricted zone: Lawn boundary</span></div>
            <div className="person-box"><span>Person 92%</span></div>
            <Camera size={48} /><p>Live stream preview</p>
            <div className="preview-controls"><button className="icon-button focus-ring" aria-label="Pause preview"><Pause size={20} /></button><button className="secondary-button focus-ring"><Settings2 size={17} /> Display options</button></div>
          </div>
        </section>
        <aside className="camera-info-stack">
          <section className="panel detail-card"><h2>Connection health</h2><dl className="detail-list">
            <div><dt><Wifi size={16} /> Status</dt><dd>{camera.status}</dd></div>
            <div><dt><Signal size={16} /> Frame rate</dt><dd>{camera.fps}</dd></div>
            <div><dt><Camera size={16} /> Resolution</dt><dd>{camera.resolution}</dd></div>
            <div><dt><Clock3 size={16} /> Last contact</dt><dd>{camera.lastSeen}</dd></div>
          </dl></section>
          <section className="panel detail-card"><div className="card-heading-inline"><h2>Detection</h2><button className="switch active" role="switch" aria-checked="true"><span /></button></div><dl className="detail-list">
            <div><dt>Confidence threshold</dt><dd>50%</dd></div>
            <div><dt>Confirmation delay</dt><dd>5 seconds</dd></div>
            <div><dt>Model</dt><dd>YELO Waste v1</dd></div>
          </dl><button className="full-inline-button focus-ring"><Settings2 size={17} /> Configure detection</button></section>
        </aside>
      </div>
      <section className="panel zones-section">
        <div className="panel-heading"><div><p className="eyebrow">Monitored areas</p><h2>Restricted zones</h2></div><button className="secondary-button focus-ring"><CircleDot size={18} /> Add zone</button></div>
        <div className="zone-cards">
          <article><div className="zone-icon"><ShieldCheck size={21} /></div><div><h3>Lawn boundary</h3><p><MapPin size={14} /> Main grass area · Detection active</p></div><StatusPill status="Active" /><button className="table-action focus-ring">Edit</button></article>
          <article><div className="zone-icon"><ShieldCheck size={21} /></div><div><h3>North walkway</h3><p><MapPin size={14} /> Pedestrian path · Detection active</p></div><StatusPill status="Active" /><button className="table-action focus-ring">Edit</button></article>
        </div>
      </section>
    </>
  );
}
