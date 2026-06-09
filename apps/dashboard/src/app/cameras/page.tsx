"use client";

import Link from "next/link";
import { Camera, CircleDot, LoaderCircle, Plus, Search, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/ui";

type CameraRow = {
  id: string;
  name: string;
  location_label: string;
  source_type: string;
  status: string;
  last_seen_at: string | null;
  restricted_zones: { count: number }[];
};

const sourceLabels: Record<string, string> = {
  mobile: "Mobile",
  webcam: "Webcam",
  rtsp: "CCTV / RTSP",
  recorded_video: "Recorded video",
};

export default function CamerasPage() {
  const auth = useAuth();
  const [cameras, setCameras] = useState<CameraRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.client || !auth.user) return;
    const timeout = window.setTimeout(async () => {
      const { data, error: loadError } = await auth.client!
        .from("cameras")
        .select("id, name, location_label, source_type, status, last_seen_at, restricted_zones(count)")
        .order("created_at", { ascending: false });
      setCameras((data ?? []) as CameraRow[]);
      setError(loadError?.message ?? "");
      setLoading(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [auth.client, auth.user]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value
      ? cameras.filter((camera) =>
          `${camera.name} ${camera.location_label}`.toLowerCase().includes(value),
        )
      : cameras;
  }, [cameras, query]);

  const online = cameras.filter((camera) => camera.status === "online").length;
  const offline = cameras.filter((camera) => camera.status === "offline").length;
  const zones = cameras.reduce(
    (total, camera) => total + (camera.restricted_zones?.[0]?.count ?? 0),
    0,
  );

  return (
    <>
      <PageHeader eyebrow="Monitoring devices" title="Cameras" description="Register sources, monitor connection health, and configure restricted zones." action={<Link className="primary-button focus-ring" href="/cameras/register"><Plus size={20} /> Register camera</Link>} />
      <div className="metric-grid compact-metrics">
        <MetricCard label="Online" value={String(online)} detail="Actively processing" tone="success" icon={Wifi} />
        <MetricCard label="Offline" value={String(offline)} detail="Needs connection review" tone="warning" icon={WifiOff} />
        <MetricCard label="Active zones" value={String(zones)} detail={`Across ${cameras.length} cameras`} tone="neutral" icon={CircleDot} />
      </div>
      <section className="panel page-panel" aria-busy={loading}>
        <div className="toolbar">
          <label className="search-field"><Search size={19} /><span className="sr-only">Search cameras</span><input type="search" placeholder="Search camera or location" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        </div>
        {loading ? (
          <div className="directory-state" role="status"><LoaderCircle className="spin" size={24} /><p>Loading cameras...</p></div>
        ) : error ? (
          <div className="directory-state error" role="alert"><p>{error}</p></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Camera} title={query ? "No matching cameras" : "No cameras registered"} description={query ? "Try another camera name or location." : "Register a mobile camera, webcam, recorded video, or CCTV source to begin monitoring."} actionLabel="Register camera" href="/cameras/register" />
        ) : (
          <div className="camera-grid">
            {filtered.map((camera) => {
              const status = camera.status[0].toUpperCase() + camera.status.slice(1);
              return (
                <article className="camera-card" key={camera.id}>
                  <div className="camera-preview"><Camera size={28} /><span className={`live-indicator ${camera.status}`}>{status}</span><small>{camera.last_seen_at ? new Date(camera.last_seen_at).toLocaleString() : "Not connected"}</small></div>
                  <div className="camera-card-body">
                    <div className="camera-card-title"><div><h2>{camera.name}</h2><p>{camera.location_label}</p></div><StatusPill status={status} /></div>
                    <dl className="camera-specs"><div><dt>Source</dt><dd>{sourceLabels[camera.source_type] ?? camera.source_type}</dd></div><div><dt>Zones</dt><dd>{camera.restricted_zones?.[0]?.count ?? 0}</dd></div></dl>
                    <Link className="secondary-button focus-ring card-action" href={`/cameras/view?id=${camera.id}`}>Open camera</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
