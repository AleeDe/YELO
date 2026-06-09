"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Clipboard,
  LoaderCircle,
  Monitor,
  Radio,
  Smartphone,
  Upload,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

type SourceType = "mobile" | "webcam" | "rtsp" | "recorded_video";
type SocietyOption = { id: string; name: string };

const sources: {
  type: SourceType;
  icon: typeof Smartphone;
  name: string;
  detail: string;
}[] = [
  { type: "mobile", icon: Smartphone, name: "Mobile camera", detail: "Use an Android phone with the YELO capture app" },
  { type: "webcam", icon: Monitor, name: "Webcam", detail: "Use a laptop or USB webcam for the demo" },
  { type: "rtsp", icon: Radio, name: "CCTV / RTSP", detail: "Register an IP camera source for later connection" },
  { type: "recorded_video", icon: Upload, name: "Recorded video", detail: "Use an MP4 file for testing and demonstrations" },
];

export default function RegisterCameraPage() {
  const auth = useAuth();
  const [societies, setSocieties] = useState<SocietyOption[]>([]);
  const [societyId, setSocietyId] = useState(auth.societyId ?? "");
  const [sourceType, setSourceType] = useState<SourceType>("mobile");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loadingSocieties, setLoadingSocieties] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deviceToken, setDeviceToken] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!auth.client || !auth.user) return;
    const timeout = window.setTimeout(async () => {
      const { data, error: societyError } = await auth.client!
        .from("societies")
        .select("id, name")
        .order("name");
      if (societyError) setError(societyError.message);
      const options = (data ?? []) as SocietyOption[];
      setSocieties(options);
      setSocietyId((current) => current || auth.societyId || options[0]?.id || "");
      setLoadingSocieties(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [auth.client, auth.societyId, auth.user]);

  async function registerCamera(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.client) return;
    setSubmitting(true);
    setError("");

    const { data, error: functionError } = await auth.client.functions.invoke(
      "register-camera",
      {
        body: {
          societyId,
          name: name.trim(),
          locationLabel: location.trim(),
          sourceType,
        },
      },
    );
    setSubmitting(false);

    if (functionError) {
      let message = functionError.message;
      if ("context" in functionError && functionError.context instanceof Response) {
        const response = await functionError.context.json().catch(() => null);
        message = response?.error ?? message;
      }
      setError(message);
      return;
    }

    setDeviceToken(data.deviceToken);
    setCameraId(data.camera.id);
  }

  async function copyToken() {
    await navigator.clipboard.writeText(deviceToken);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  const selectedSource = sources.find((source) => source.type === sourceType)!;

  if (deviceToken) {
    return (
      <>
        <Link href="/cameras" className="back-link focus-ring"><ArrowLeft size={18} /> Back to cameras</Link>
        <section className="panel token-result" aria-labelledby="token-title">
          <span className="token-success-icon"><CheckCircle2 size={30} /></span>
          <div><p className="eyebrow">Camera registered</p><h1 id="token-title">Save the device token</h1><p>This token is shown only once. YELO stored only its SHA-256 hash.</p></div>
          <div className="device-token-box"><code>{deviceToken}</code><button className="secondary-button focus-ring" type="button" onClick={() => void copyToken()}>{copied ? <Check size={18} /> : <Clipboard size={18} />}{copied ? "Copied" : "Copy token"}</button></div>
          <div className="auth-notice warning"><AlertCircle size={20} /><div><strong>Do not lose this token</strong><p>You will enter it in the mobile or webcam capture client. A replacement token requires a secure rotation workflow.</p></div></div>
          <div className="form-actions"><Link href={`/cameras/view?id=${cameraId}`} className="secondary-button focus-ring">Open camera</Link><Link href="/capture" className="primary-button focus-ring">Connect device <Camera size={18} /></Link></div>
        </section>
      </>
    );
  }

  return (
    <>
      <Link href="/cameras" className="back-link focus-ring"><ArrowLeft size={18} /> Back to cameras</Link>
      <div className="form-page-heading"><p className="eyebrow">New monitoring source</p><h1>Register camera</h1><p className="page-subtitle">Create a secure camera identity before connecting the mobile, webcam, video, or CCTV source.</p></div>
      <div className="setup-layout">
        <ol className="stepper" aria-label="Camera registration progress">
          <li className="active"><span>1</span><div><strong>Register</strong><small>Source and details</small></div></li>
          <li><span>2</span><div><strong>Token</strong><small>Save once</small></div></li>
          <li><span>3</span><div><strong>Connect</strong><small>Pair the device</small></div></li>
          <li><span>4</span><div><strong>Zone</strong><small>Define restricted area</small></div></li>
        </ol>
        <form className="panel setup-card" onSubmit={registerCamera}>
          <div className="setup-card-heading"><p className="eyebrow">Step 1 of 4</p><h2>Camera identity</h2><p>Select the owning society and the source that will send frames to YELO.</p></div>
          <div className="form-grid">
            <label className="form-field full-field"><span>Owning society</span><select required disabled={loadingSocieties || auth.role !== "super_admin"} value={societyId} onChange={(event) => setSocietyId(event.target.value)}><option value="">{loadingSocieties ? "Loading societies..." : "Select society"}</option>{societies.map((society) => <option key={society.id} value={society.id}>{society.name}</option>)}</select></label>
          </div>
          <fieldset className="source-fieldset"><legend>Camera source</legend><div className="source-options">
            {sources.map((source) => {
              const Icon = source.icon;
              const selected = sourceType === source.type;
              return <label className={`source-option ${selected ? "selected" : ""}`} key={source.type}><input type="radio" name="source" value={source.type} checked={selected} onChange={() => setSourceType(source.type)} /><span className="source-icon"><Icon size={23} /></span><span><strong>{source.name}</strong><small>{source.detail}</small></span>{selected && <Check size={20} className="source-check" />}</label>;
            })}
          </div></fieldset>
          <div className="setup-preview"><div className="setup-preview-icon"><Video size={25} /></div><div><strong>{selectedSource.name} registration</strong><p>A one-time device token will be generated after these details are saved.</p></div></div>
          <div className="form-grid">
            <label className="form-field"><span>Camera name</span><input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Park north entrance" /></label>
            <label className="form-field"><span>Location label</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Block C community park" /></label>
          </div>
          {error && <div className="auth-error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
          <div className="form-actions"><Link href="/cameras" className="secondary-button focus-ring">Cancel</Link><button type="submit" className="primary-button focus-ring" disabled={submitting || loadingSocieties || !societyId}>{submitting ? <LoaderCircle className="spin" size={18} /> : <Camera size={18} />}{submitting ? "Registering..." : "Register camera"}</button></div>
        </form>
      </div>
    </>
  );
}
