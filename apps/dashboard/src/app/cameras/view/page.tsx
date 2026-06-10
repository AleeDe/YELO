"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  ChevronDown,
  Clock3,
  Edit3,
  ExternalLink,
  LoaderCircle,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { StatusPill } from "@/components/ui";
import {
  RestrictedZone,
  ZoneEditor,
} from "@/components/zone-editor";

type CameraDetail = {
  id: string;
  society_id: string;
  name: string;
  location_label: string | null;
  source_type: "mobile" | "webcam" | "rtsp" | "recorded_video";
  status: string;
  detection_enabled: boolean;
  confidence_threshold: number;
  confirmation_seconds: number;
  last_seen_at: string | null;
  restricted_zones: RestrictedZone[];
};

type EditForm = {
  name: string;
  location: string;
  sourceType: CameraDetail["source_type"];
  detectionEnabled: boolean;
  confidenceThreshold: number;
  confirmationSeconds: number;
};

const sourceLabels: Record<CameraDetail["source_type"], string> = {
  mobile: "Mobile camera",
  webcam: "Webcam",
  rtsp: "CCTV / RTSP",
  recorded_video: "Recorded video",
};

const sourceGuidance: Record<
  CameraDetail["source_type"],
  { state: string; title: string; steps: string[]; note: string }
> = {
  mobile: {
    state: "Available now",
    title: "Connect an Android or mobile browser",
    steps: [
      "Copy the one-time token shown when this camera is registered.",
      "Open YELO on the phone and choose “Use this device as a camera”, or open /capture.",
      "Paste the token, connect, then allow camera permission.",
      "Tap Start camera, switch to the rear lens, position the phone, and keep YELO open.",
    ],
    note: "The phone needs internet access. Closing the page stops its heartbeat and preview.",
  },
  webcam: {
    state: "Available now",
    title: "Connect a laptop or USB webcam",
    steps: [
      "Open YELO /capture in Chrome or Edge on the computer connected to the webcam.",
      "Paste the one-time camera token and select Connect camera.",
      "Allow browser camera permission and select Start camera.",
      "Keep the browser tab open while monitoring.",
    ],
    note: "Use HTTPS in production. Localhost is allowed during development.",
  },
  rtsp: {
    state: "Gateway required",
    title: "Connect an IP CCTV camera",
    steps: [
      "Find the camera’s RTSP URL from its manufacturer or NVR settings.",
      "Run a local zero-cost gateway such as MediaMTX with FFmpeg on a PC or Raspberry Pi.",
      "Keep the RTSP username and password in the gateway, never in browser code.",
      "The next YELO milestone will let that gateway send frames or WebRTC video to detection.",
    ],
    note: "Raw RTSP cannot play directly in normal web browsers. CCTV registration exists, but ingestion is not connected yet.",
  },
  recorded_video: {
    state: "Planned",
    title: "Process a demonstration video",
    steps: [
      "Prepare a short MP4 showing the monitored area.",
      "The upcoming upload processor will sample frames and run the detection model.",
      "Detected events will then appear in the same incident workflow as live cameras.",
    ],
    note: "Recorded-video upload and inference are not implemented yet.",
  },
};

function formFromCamera(camera: CameraDetail): EditForm {
  return {
    name: camera.name,
    location: camera.location_label ?? "",
    sourceType: camera.source_type,
    detectionEnabled: camera.detection_enabled,
    confidenceThreshold: Math.round(Number(camera.confidence_threshold) * 100),
    confirmationSeconds: camera.confirmation_seconds,
  };
}

export default function CameraDetailPage() {
  const auth = useAuth();
  const router = useRouter();
  const editDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [camera, setCamera] = useState<CameraDetail | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const canManage = auth.role === "super_admin" || auth.role === "society_admin";

  useEffect(() => {
    if (!auth.client || !auth.user) return;
    const timeout = window.setTimeout(async () => {
      const id = new URLSearchParams(window.location.search).get("id");
      if (!id) {
        setLoading(false);
        return;
      }
      const { data, error: loadError } = await auth.client!
        .from("cameras")
        .select("id, society_id, name, location_label, source_type, status, detection_enabled, confidence_threshold, confirmation_seconds, last_seen_at, restricted_zones(id, name, polygon, is_active)")
        .eq("id", id)
        .maybeSingle();
      setCamera(data as CameraDetail | null);
      setError(loadError?.message ?? "");
      setLoading(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [auth.client, auth.user]);

  function openEditDialog() {
    if (!camera) return;
    setForm(formFromCamera(camera));
    setError("");
    editDialogRef.current?.showModal();
  }

  async function saveCamera(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.client || !camera || !form) return;
    setSaving(true);
    setError("");
    const { data, error: updateError } = await auth.client
      .from("cameras")
      .update({
        name: form.name.trim(),
        location_label: form.location.trim() || null,
        source_type: form.sourceType,
        detection_enabled: form.detectionEnabled,
        confidence_threshold: form.confidenceThreshold / 100,
        confirmation_seconds: form.confirmationSeconds,
      })
      .eq("id", camera.id)
      .select("id, society_id, name, location_label, source_type, status, detection_enabled, confidence_threshold, confirmation_seconds, last_seen_at, restricted_zones(id, name, polygon, is_active)")
      .single();
    setSaving(false);
    if (updateError || !data) {
      setError(updateError?.message ?? "The camera could not be updated.");
      return;
    }
    setCamera(data as CameraDetail);
    setFeedback("Camera settings saved.");
    editDialogRef.current?.close();
    window.setTimeout(() => setFeedback(""), 3500);
  }

  async function deleteCamera(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.client || !camera || deleteConfirmation !== camera.name) return;
    setDeleting(true);
    setError("");
    const { error: deleteError } = await auth.client
      .from("cameras")
      .delete()
      .eq("id", camera.id);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    deleteDialogRef.current?.close();
    router.replace("/cameras");
  }

  if (loading) return <div className="directory-state" role="status"><LoaderCircle className="spin" size={24} /><p>Loading camera...</p></div>;
  if (!camera) return <div className="directory-state"><Camera size={28} /><h1>Camera not found</h1><p>{error || "This camera does not exist or your account cannot access it."}</p><Link href="/cameras" className="secondary-button focus-ring">Back to cameras</Link></div>;

  const status = camera.status[0].toUpperCase() + camera.status.slice(1);
  const guidance = sourceGuidance[camera.source_type];

  return (
    <>
      <Link href="/cameras" className="back-link focus-ring"><ArrowLeft size={18} /> Back to cameras</Link>
      <div className="detail-heading camera-detail-heading">
        <div><p className="eyebrow">{camera.id.slice(0, 8)}</p><h1>{camera.name}</h1><p className="page-subtitle">{camera.location_label || "No location label"} · {sourceLabels[camera.source_type]}</p></div>
        <div className="camera-heading-actions">
          <StatusPill status={status} />
          {canManage && <button className="secondary-button focus-ring" type="button" onClick={openEditDialog}><Edit3 size={18} /> Camera settings</button>}
        </div>
      </div>
      {feedback && <div className="page-feedback success" role="status">{feedback}</div>}
      <div className="camera-detail-grid">
        <section className="panel live-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Camera source</p><h2>{camera.status === "online" ? "Live camera" : "Camera is offline"}</h2></div>
            {(camera.source_type === "mobile" || camera.source_type === "webcam") && <Link className="primary-button focus-ring camera-connect-action" href={`/capture?returnTo=${encodeURIComponent(`/cameras/view?id=${camera.id}`)}`}>Connect camera <ExternalLink size={17} /></Link>}
          </div>
          <div className="live-preview">
            <span className="preview-empty-icon"><Camera size={34} /></span>
            <strong>{camera.status === "online" ? "Waiting for video frames" : "No live video"}</strong>
            <p>{camera.status === "online" ? "The device heartbeat is active. Dashboard frame streaming is the next milestone." : "Connect the registered device to bring this camera online."}</p>
          </div>
        </section>
        <aside className="panel camera-summary-card" aria-label="Camera status summary">
          <div className="camera-summary-heading"><div><p className="eyebrow">At a glance</p><h2>Camera status</h2></div><StatusPill status={status} /></div>
          <dl className="camera-summary-grid">
            <div><dt><Wifi size={16} /> Status</dt><dd>{status}</dd></div>
            <div><dt><Camera size={16} /> Source</dt><dd>{sourceLabels[camera.source_type]}</dd></div>
            <div><dt><Clock3 size={16} /> Last contact</dt><dd>{camera.last_seen_at ? new Date(camera.last_seen_at).toLocaleString() : "Never"}</dd></div>
            <div><dt>Enabled</dt><dd>{camera.detection_enabled ? "Yes" : "No"}</dd></div>
            <div><dt>Confidence threshold</dt><dd>{Math.round(Number(camera.confidence_threshold) * 100)}%</dd></div>
            <div><dt>Confirmation delay</dt><dd>{camera.confirmation_seconds} seconds</dd></div>
          </dl>
        </aside>
      </div>

      <details className="panel connection-guide">
        <summary className="focus-ring">
          <span className="connection-summary-icon"><Wifi size={20} /></span>
          <span><small>Connection guide</small><strong>{guidance.title}</strong></span>
          <span className="connection-state">{guidance.state}</span>
          <ChevronDown className="connection-chevron" size={20} aria-hidden="true" />
        </summary>
        <div className="connection-guide-content">
          <ol>{guidance.steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
          <div className="connection-note"><AlertCircle size={19} /><p>{guidance.note}</p></div>
        </div>
      </details>

      <section className="panel zones-section">
        {canManage && auth.client ? (
          <ZoneEditor
            cameraId={camera.id}
            societyId={camera.society_id}
            client={auth.client}
            zones={camera.restricted_zones}
            onZonesChange={(restricted_zones) =>
              setCamera((current) => current ? { ...current, restricted_zones } : current)
            }
          />
        ) : (
          <div className="zone-manager">
            <div className="zone-manager-header">
              <div><p className="eyebrow">Monitored areas</p><h2>Restricted zones</h2></div>
            </div>
            <div className="zone-list">
              {camera.restricted_zones.map((zone) => (
                <article key={zone.id}>
                  <div><h3>{zone.name}</h3><p>{zone.polygon.length} boundary points</p></div>
                  <StatusPill status={zone.is_active ? "Active" : "Paused"} />
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <dialog ref={editDialogRef} className="form-dialog" onCancel={(event) => { if (saving) event.preventDefault(); }} onClick={(event) => { if (event.target === editDialogRef.current && !saving) editDialogRef.current?.close(); }}>
        {form && <form className="dialog-card" onSubmit={saveCamera}>
          <div className="dialog-heading"><div><p className="eyebrow">Camera settings</p><h2>Edit camera</h2><p>Update identity, source, and detection defaults.</p></div><button className="icon-button focus-ring" type="button" aria-label="Close edit camera dialog" disabled={saving} onClick={() => editDialogRef.current?.close()}><X size={20} /></button></div>
          <div className="form-grid">
            <label className="form-field"><span>Camera name</span><input autoFocus required minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="form-field"><span>Location label</span><input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
            <label className="form-field"><span>Source type</span><select value={form.sourceType} onChange={(event) => setForm({ ...form, sourceType: event.target.value as CameraDetail["source_type"] })}><option value="mobile">Mobile camera</option><option value="webcam">Webcam</option><option value="rtsp">CCTV / RTSP</option><option value="recorded_video">Recorded video</option></select></label>
            <label className="form-field"><span>Confidence threshold (%)</span><input type="number" min={1} max={100} value={form.confidenceThreshold} onChange={(event) => setForm({ ...form, confidenceThreshold: Number(event.target.value) })} /></label>
            <label className="form-field"><span>Confirmation delay (seconds)</span><input type="number" min={1} max={60} value={form.confirmationSeconds} onChange={(event) => setForm({ ...form, confirmationSeconds: Number(event.target.value) })} /></label>
            <label className="camera-detection-choice"><input type="checkbox" checked={form.detectionEnabled} onChange={(event) => setForm({ ...form, detectionEnabled: event.target.checked })} /><span><strong>Enable detection</strong><small>Allow this camera to generate possible incidents.</small></span></label>
          </div>
          {error && <div className="auth-error" role="alert"><AlertCircle size={18} />{error}</div>}
          <div className="camera-dialog-danger"><div><strong>Remove this camera</strong><p>Deleting also removes its incident history and zones.</p></div><button className="danger-button focus-ring" type="button" disabled={saving} onClick={() => { editDialogRef.current?.close(); setDeleteConfirmation(""); setError(""); deleteDialogRef.current?.showModal(); }}><Trash2 size={17} /> Delete camera</button></div>
          <div className="dialog-actions"><button className="secondary-button focus-ring" type="button" disabled={saving} onClick={() => editDialogRef.current?.close()}>Cancel</button><button className="primary-button focus-ring" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={18} /> : <Edit3 size={18} />}{saving ? "Saving..." : "Save changes"}</button></div>
        </form>}
      </dialog>

      <dialog ref={deleteDialogRef} className="form-dialog delete-dialog" onCancel={(event) => { if (deleting) event.preventDefault(); }} onClick={(event) => { if (event.target === deleteDialogRef.current && !deleting) deleteDialogRef.current?.close(); }}>
        <form className="dialog-card" onSubmit={deleteCamera}>
          <div className="dialog-heading"><div><p className="eyebrow danger-text">Permanent action</p><h2>Delete camera?</h2><p>This also permanently deletes its restricted zones, detection events, evidence references, and related notifications.</p></div><button className="icon-button focus-ring" type="button" aria-label="Close delete camera dialog" disabled={deleting} onClick={() => deleteDialogRef.current?.close()}><X size={20} /></button></div>
          <div className="auth-notice warning"><AlertCircle size={20} /><div><strong>This cannot be undone</strong><p>Disable detection instead if you need to preserve historical incident data.</p></div></div>
          <label className="form-field"><span>Type <strong>{camera.name}</strong> to confirm</span><input autoFocus value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" /></label>
          {error && <div className="auth-error" role="alert"><AlertCircle size={18} />{error}</div>}
          <div className="dialog-actions"><button className="secondary-button focus-ring" type="button" disabled={deleting} onClick={() => deleteDialogRef.current?.close()}>Keep camera</button><button className="delete-confirm-button focus-ring" type="submit" disabled={deleting || deleteConfirmation !== camera.name}>{deleting ? <LoaderCircle className="spin" size={18} /> : <Trash2 size={18} />}{deleting ? "Deleting..." : "Delete permanently"}</button></div>
        </form>
      </dialog>
    </>
  );
}
