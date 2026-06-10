"use client";

import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Unplug,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  inferenceUrl,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase/config";

type CameraInfo = {
  id: string;
  name: string;
  location_label: string | null;
  source_type: string;
  status: string;
  last_seen_at: string | null;
  detection_enabled: boolean;
  restricted_zones: RestrictedZone[];
};

type DeviceAction = "pair" | "heartbeat" | "disconnect";
type FacingMode = "user" | "environment";
type ProcessorState = "idle" | "sending" | "connected" | "error";
type Detection = {
  classId: number;
  label: string;
  confidence: number;
  trackId: number | null;
  center: { x: number; y: number };
  groundPoint: { x: number; y: number };
  motion: { dx: number; dy: number; distance: number };
  inRestrictedZone: boolean;
  zones: { id: string; name: string }[];
  trail: { x: number; y: number }[];
  box: { x: number; y: number; width: number; height: number };
};
type RestrictedZone = {
  id: string;
  name: string;
  polygon: { x: number; y: number }[];
};
type EventCandidate = {
  trackId: number;
  label: string;
  zoneId: string;
  zoneName: string;
  personTrackId: number;
  stationary: boolean;
  elapsedSeconds: number;
  requiredSeconds: number;
  progress: number;
};

const tokenStorageKey = "yelo-camera-device-token";
const processorUrlStorageKey = "yelo-inference-url";

function cameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Camera permission was denied. Allow camera access in your browser or phone settings, then try again.";
    }
    if (error.name === "NotFoundError") {
      return "No usable camera was found on this device.";
    }
    if (error.name === "NotReadableError") {
      return "The camera is busy in another app. Close that app and try again.";
    }
  }
  return error instanceof Error ? error.message : "The camera could not be started.";
}

export default function CapturePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sendingFrameRef = useRef(false);
  const publishingFrameRef = useRef(false);
  const lastPublishedFrameRef = useRef(0);
  const returnPathRef = useRef("/cameras");
  const [token, setToken] = useState("");
  const [camera, setCamera] = useState<CameraInfo | null>(null);
  const [pairing, setPairing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [videoAspectRatio, setVideoAspectRatio] = useState("16 / 9");
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [processorState, setProcessorState] = useState<ProcessorState>("idle");
  const [processorUrl, setProcessorUrl] = useState(inferenceUrl);
  const [framesSent, setFramesSent] = useState(0);
  const [processorLatency, setProcessorLatency] = useState<number | null>(null);
  const [inferenceLatency, setInferenceLatency] = useState<number | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [restrictedZones, setRestrictedZones] = useState<RestrictedZone[]>([]);
  const [violationCount, setViolationCount] = useState(0);
  const [eventCandidates, setEventCandidates] = useState<EventCandidate[]>([]);
  const [confirmedEventCount, setConfirmedEventCount] = useState(0);
  const [dashboardPreviewAt, setDashboardPreviewAt] = useState<Date | null>(null);
  const [modelName, setModelName] = useState("");
  const [processorMessage, setProcessorMessage] = useState(
    "Starts when the camera preview is running.",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const restoreToken = window.setTimeout(() => {
      setToken(window.sessionStorage.getItem(tokenStorageKey) ?? "");
      setProcessorUrl(
        window.localStorage.getItem(processorUrlStorageKey) ?? inferenceUrl,
      );
      const requestedPath = new URLSearchParams(window.location.search).get("returnTo");
      if (requestedPath?.startsWith("/") && !requestedPath.startsWith("//")) {
        returnPathRef.current = requestedPath;
      }
    }, 0);
    return () => {
      window.clearTimeout(restoreToken);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!streaming) return;
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [streaming]);

  const callDevice = useCallback(async (action: DeviceAction, deviceToken: string) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("YELO is missing its Supabase public configuration.");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/camera-device`, {
      method: "POST",
      keepalive: action === "disconnect",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, token: deviceToken }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.error ?? "The camera device request failed.");
    }
    return result.camera as CameraInfo;
  }, []);

  const sendHeartbeat = useCallback(async () => {
    if (!token) return;
    try {
      const updated = await callDevice("heartbeat", token);
      setCamera(updated);
      setLastHeartbeat(new Date());
      setError("");
    } catch (heartbeatError) {
      setError(
        heartbeatError instanceof Error
          ? heartbeatError.message
          : "The camera heartbeat failed.",
      );
    }
  }, [callDevice, token]);

  const sendFrame = useCallback(async () => {
    const video = videoRef.current;
    if (
      !camera ||
      !token ||
      !video ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      sendingFrameRef.current
    ) {
      return;
    }

    sendingFrameRef.current = true;
    setProcessorState("sending");
    const startedAt = performance.now();
    try {
      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;
      if (!sourceWidth || !sourceHeight) return;
      const width = Math.min(sourceWidth, 960);
      const height = Math.round((sourceHeight / sourceWidth) * width);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("This device could not prepare a camera frame.");
      context.drawImage(video, 0, 0, width, height);
      const frame = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.72),
      );
      if (!frame) throw new Error("This device could not encode a camera frame.");
      const capturedAt = new Date().toISOString();
      const now = Date.now();
      if (
        supabaseUrl &&
        supabaseAnonKey &&
        !publishingFrameRef.current &&
        now - lastPublishedFrameRef.current >= 2_000
      ) {
        publishingFrameRef.current = true;
        lastPublishedFrameRef.current = now;
        void fetch(`${supabaseUrl}/functions/v1/camera-live-frame`, {
          method: "POST",
          headers: {
            apikey: supabaseAnonKey,
            "Content-Type": "image/jpeg",
            "X-YELO-Camera-Id": camera.id,
            "X-YELO-Camera-Token": token,
            "X-YELO-Captured-At": capturedAt,
          },
          body: frame,
        })
          .then(async (liveResponse) => {
            if (!liveResponse.ok) {
              const liveResult = await liveResponse.json().catch(() => null);
              throw new Error(liveResult?.error ?? "Dashboard preview upload failed.");
            }
            setDashboardPreviewAt(new Date(capturedAt));
          })
          .catch((publishError) => {
            console.warn("Dashboard preview unavailable:", publishError);
          })
          .finally(() => {
            publishingFrameRef.current = false;
          });
      }

      const response = await fetch(`${processorUrl.replace(/\/$/, "")}/frames`, {
        method: "POST",
        headers: {
          "Content-Type": "image/jpeg",
          "X-YELO-Camera-Id": camera.id,
          "X-YELO-Camera-Token": token,
          "X-YELO-Captured-At": capturedAt,
        },
        body: frame,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error ?? `Inference gateway returned HTTP ${response.status}.`);
      }

      const frameNumber = Number(result?.frameNumber);
      if (Number.isFinite(frameNumber) && frameNumber > 0) {
        setFramesSent(frameNumber);
      } else {
        setFramesSent((current) => current + 1);
      }
      setProcessorLatency(Math.round(performance.now() - startedAt));
      setProcessorState("connected");
      setDetections(Array.isArray(result?.detections) ? result.detections : []);
      setRestrictedZones(
        Array.isArray(result?.restrictedZones) ? result.restrictedZones : [],
      );
      setViolationCount(Number(result?.violationCount) || 0);
      setEventCandidates(
        Array.isArray(result?.eventCandidates) ? result.eventCandidates : [],
      );
      if (Array.isArray(result?.confirmedEvents) && result.confirmedEvents.length > 0) {
        setConfirmedEventCount((current) => current + result.confirmedEvents.length);
      }
      setInferenceLatency(
        Number.isFinite(Number(result?.inferenceMs))
          ? Math.round(Number(result.inferenceMs))
          : null,
      );
      setModelName(typeof result?.modelName === "string" ? result.modelName : "");
      setProcessorMessage(
        result?.modelReady
          ? `${Number(result?.detectionCount) || 0} objects detected in the latest frame.`
          : "Frames are reaching the local gateway. YOLO is not loaded yet.",
      );
    } catch (frameError) {
      setProcessorState("error");
      setDetections([]);
      setViolationCount(0);
      setEventCandidates([]);
      setProcessorMessage(
        frameError instanceof TypeError
          ? `Local processor not reachable at ${processorUrl}. Start the YELO inference gateway and check the device network.`
          : frameError instanceof Error
            ? frameError.message
            : "The local inference gateway is unavailable.",
      );
    } finally {
      sendingFrameRef.current = false;
    }
  }, [camera, processorUrl, token]);

  useEffect(() => {
    if (!streaming || !token) return;
    const interval = window.setInterval(() => void sendHeartbeat(), 25_000);
    return () => window.clearInterval(interval);
  }, [sendHeartbeat, streaming, token]);

  useEffect(() => {
    if (!streaming || !camera || !token) return;
    const interval = window.setInterval(() => void sendFrame(), 1_000);
    return () => window.clearInterval(interval);
  }, [camera, sendFrame, streaming, token]);

  async function pairDevice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanToken = token.trim();
    if (!cleanToken) return;
    setPairing(true);
    setError("");
    try {
      const pairedCamera = await callDevice("pair", cleanToken);
      window.sessionStorage.setItem(tokenStorageKey, cleanToken);
      setToken(cleanToken);
      setCamera(pairedCamera);
      setLastHeartbeat(new Date());
      setFramesSent(0);
      setProcessorLatency(null);
      setInferenceLatency(null);
      setDetections([]);
      setRestrictedZones(pairedCamera.restricted_zones ?? []);
      setViolationCount(0);
      setEventCandidates([]);
      setConfirmedEventCount(0);
      setDashboardPreviewAt(null);
      setModelName("");
    } catch (pairError) {
      setCamera(null);
      window.sessionStorage.removeItem(tokenStorageKey);
      setError(pairError instanceof Error ? pairError.message : "Pairing failed.");
    } finally {
      setPairing(false);
    }
  }

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
    setProcessorState("idle");
    setDetections([]);
    setViolationCount(0);
    setEventCandidates([]);
    setProcessorMessage("Starts when the camera preview is running.");
  }

  async function stopPreview() {
    stopTracks();
    if (!camera || !token) return;
    try {
      const updated = await callDevice("disconnect", token);
      setCamera(updated);
    } catch (stopError) {
      setError(
        stopError instanceof Error
          ? stopError.message
          : "The camera status could not be updated.",
      );
    }
  }

  async function startCamera(nextFacingMode: FacingMode = facingMode) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not support camera capture. Use a current Chrome, Edge, or Android build.");
      return;
    }
    setStarting(true);
    setError("");
    stopTracks();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: nextFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
          setVideoAspectRatio(
            `${videoRef.current.videoWidth} / ${videoRef.current.videoHeight}`,
          );
        }
      }
      setFacingMode(nextFacingMode);
      setStreaming(true);
      void sendHeartbeat();
      void sendFrame();
    } catch (mediaError) {
      setError(cameraErrorMessage(mediaError));
    } finally {
      setStarting(false);
    }
  }

  async function disconnect() {
    stopTracks();
    const pairedToken = token;
    setError("");
    try {
      if (camera && pairedToken) await callDevice("disconnect", pairedToken);
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "The camera could not be disconnected cleanly.",
      );
    } finally {
      window.sessionStorage.removeItem(tokenStorageKey);
      setCamera(null);
      setToken("");
      setLastHeartbeat(null);
      setFramesSent(0);
      setProcessorLatency(null);
      setInferenceLatency(null);
      setDetections([]);
      setRestrictedZones([]);
      setViolationCount(0);
      setEventCandidates([]);
      setConfirmedEventCount(0);
      setDashboardPreviewAt(null);
      setModelName("");
    }
  }

  function openDashboard() {
    const dashboard = window.open(
      returnPathRef.current,
      "_blank",
      "noopener,noreferrer",
    );
    if (!dashboard) {
      setError("Your browser blocked the dashboard tab. Allow pop-ups for YELO, then try again.");
    }
  }

  function leaveCapture() {
    stopTracks();
    if (camera && token) void callDevice("disconnect", token).catch(() => undefined);
    router.push(returnPathRef.current);
  }

  function updateProcessorUrl(value: string) {
    setProcessorUrl(value);
    window.localStorage.setItem(processorUrlStorageKey, value);
    setProcessorState("idle");
    setProcessorMessage("Starts when the camera preview is running.");
  }

  return (
    <main className="capture-page">
      <header className="capture-header">
        <div className="capture-brand" aria-label="YELO camera">
          <span className="capture-brand-mark" aria-hidden="true">Y</span>
          <span><strong>YELO Capture</strong><small>Mobile and webcam source</small></span>
        </div>
        <div className={`capture-connection ${camera ? "connected" : ""}`} role="status">
          <span aria-hidden="true" />
          {camera ? "Device paired" : "Not paired"}
        </div>
      </header>

      <nav className="capture-context-nav" aria-label="Capture navigation">
        {streaming ? (
          <>
            <button className="capture-back-link primary focus-ring" type="button" onClick={openDashboard}>
              <ExternalLink size={18} />
              <span>Open dashboard</span>
            </button>
            <span className="capture-navigation-note">Capture stays open in this tab</span>
          </>
        ) : (
          <button className="capture-back-link focus-ring" type="button" onClick={leaveCapture}>
            <ArrowLeft size={18} />
            <span>Back to cameras</span>
          </button>
        )}
      </nav>

      <div className={`capture-layout ${camera ? "paired" : "unpaired"}`}>
        <section className="capture-stage" aria-labelledby="capture-title">
          <div className="capture-stage-heading">
            <div>
              <p className="eyebrow">Monitoring source</p>
              <h1 id="capture-title">{camera?.name ?? "Camera preview"}</h1>
              <p>{camera?.location_label ?? "The preview becomes available after this device is securely paired."}</p>
            </div>
            {camera && (
              <span className="capture-secure-badge"><ShieldCheck size={18} /> Token verified</span>
            )}
          </div>

          <div
            className={`capture-video-frame ${streaming ? "is-live" : ""}`}
            style={streaming ? { aspectRatio: videoAspectRatio } : undefined}
          >
            <video ref={videoRef} muted playsInline aria-label="Live camera preview" />
            {!streaming && (
              <div className="capture-video-empty">
                <span><CameraOff size={34} /></span>
                <strong>Camera preview is off</strong>
                <p>{camera ? "Start the camera when the device is positioned." : "Enter the one-time token first."}</p>
              </div>
            )}
            {streaming && <span className="capture-live-label"><i /> Live preview</span>}
            {streaming && (detections.length > 0 || restrictedZones.length > 0) && (
              <div className="capture-detection-layer" aria-hidden="true">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                  {restrictedZones.map((zone) => (
                    <polygon
                      className="restricted-zone-overlay"
                      key={zone.id}
                      points={zone.polygon.map((point) => `${point.x * 100},${point.y * 100}`).join(" ")}
                    />
                  ))}
                  {detections.map((detection, index) => (
                    detection.trail.length > 1 && (
                      <polyline
                        className={detection.label.toLowerCase() === "person" ? "person" : ""}
                        key={`trail-${detection.trackId ?? index}`}
                        points={detection.trail.map((point) => `${point.x * 100},${point.y * 100}`).join(" ")}
                      />
                    )
                  ))}
                </svg>
                {detections.map((detection, index) => (
                  <span
                    className={`capture-detection-box ${detection.label.toLowerCase() === "person" ? "person" : ""} ${detection.inRestrictedZone ? "zone-violation" : ""}`}
                    key={`${detection.classId}-${index}`}
                    style={{
                      left: `${detection.box.x * 100}%`,
                      top: `${detection.box.y * 100}%`,
                      width: `${detection.box.width * 100}%`,
                      height: `${detection.box.height * 100}%`,
                    }}
                  >
                    <small>
                      {detection.inRestrictedZone ? "Restricted · " : ""}{detection.label}{detection.trackId !== null ? ` #${detection.trackId}` : ""} {Math.round(detection.confidence * 100)}%
                    </small>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="capture-alert" role="alert">
              <AlertCircle size={21} />
              <div><strong>Action needed</strong><p>{error}</p></div>
            </div>
          )}

          {camera && (
            <div className="capture-actions">
              {!streaming ? (
                <button className="primary-button focus-ring" type="button" disabled={starting} onClick={() => void startCamera()}>
                  {starting ? <LoaderCircle className="spin" size={20} /> : <Camera size={20} />}
                  {starting ? "Opening camera..." : "Start camera"}
                </button>
              ) : (
                <>
                  <button className="secondary-button focus-ring" type="button" onClick={() => void startCamera(facingMode === "environment" ? "user" : "environment")}>
                    <RefreshCw size={19} /> Switch camera
                  </button>
                  <button className="capture-stop-button focus-ring" type="button" onClick={() => void stopPreview()}>
                    <CameraOff size={19} /> Stop preview
                  </button>
                  <button className="quiet-button focus-ring" type="button" onClick={leaveCapture}>
                    Stop and leave
                  </button>
                </>
              )}
            </div>
          )}
        </section>

        <aside className="capture-control" aria-label="Camera connection">
          {!camera ? (
            <form onSubmit={pairDevice}>
              <span className="capture-control-icon"><Smartphone size={24} /></span>
              <p className="eyebrow">Step 1</p>
              <h2>Pair this device</h2>
              <p>Paste the one-time token shown after camera registration. It stays only in this browser session.</p>
              <label className="form-field">
                <span>Device token</span>
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="yelo_cam_..."
                  required
                />
              </label>
              <button className="primary-button focus-ring capture-pair-button" type="submit" disabled={pairing || !token.trim()}>
                {pairing ? <LoaderCircle className="spin" size={19} /> : <ShieldCheck size={19} />}
                {pairing ? "Verifying..." : "Connect camera"}
              </button>
              <small className="capture-privacy-note">The raw token is never stored in the YELO database.</small>
              <details className="capture-advanced">
                <summary className="focus-ring">Local processor settings</summary>
                <label className="form-field">
                  <span>Processor URL</span>
                  <input
                    type="url"
                    inputMode="url"
                    value={processorUrl}
                    onChange={(event) => updateProcessorUrl(event.target.value)}
                    placeholder="http://192.168.1.3:8000"
                  />
                  <small>On a phone, use the laptop&apos;s Wi-Fi IP address, not 127.0.0.1.</small>
                </label>
              </details>
            </form>
          ) : (
            <div className="capture-device-card">
              <span className="capture-control-icon success"><CheckCircle2 size={24} /></span>
              <p className="eyebrow">Connected device</p>
              <h2>{camera.name}</h2>
              <dl>
                <div><dt>Status</dt><dd><span className="capture-status-dot" /> {streaming ? "Streaming" : "Paired"}</dd></div>
                <div><dt>Source</dt><dd>{camera.source_type.replaceAll("_", " ")}</dd></div>
                <div><dt>Heartbeat</dt><dd>{lastHeartbeat ? lastHeartbeat.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Waiting"}</dd></div>
                <div><dt>Detection</dt><dd>{camera.detection_enabled ? "Enabled" : "Paused"}</dd></div>
                <div><dt>Processor</dt><dd><span className={`processor-dot ${processorState}`} /> {processorState === "connected" ? "Receiving" : processorState === "error" ? "Unavailable" : processorState === "sending" ? "Sending" : "Waiting"}</dd></div>
                <div><dt>Frames sent</dt><dd>{framesSent}{processorLatency !== null ? ` · ${processorLatency} ms` : ""}</dd></div>
                <div><dt>Latest objects</dt><dd>{detections.length}</dd></div>
                <div><dt>Restricted areas</dt><dd>{restrictedZones.length}</dd></div>
                <div><dt>Objects in zones</dt><dd className={violationCount > 0 ? "capture-warning-value" : ""}>{violationCount}</dd></div>
                <div><dt>Confirming events</dt><dd>{eventCandidates.length}</dd></div>
                <div><dt>Events reported</dt><dd>{confirmedEventCount}</dd></div>
                <div><dt>Dashboard preview</dt><dd>{dashboardPreviewAt ? dashboardPreviewAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Waiting"}</dd></div>
                <div><dt>YOLO inference</dt><dd>{inferenceLatency !== null ? `${inferenceLatency} ms` : "Waiting"}</dd></div>
              </dl>
              {eventCandidates.length > 0 && (
                <div className="capture-event-candidates" role="status" aria-live="polite">
                  <strong>Checking possible littering</strong>
                  {eventCandidates.map((candidate) => (
                    <div key={`${candidate.zoneId}-${candidate.trackId}`}>
                      <span>
                        {candidate.label} #{candidate.trackId} in {candidate.zoneName}
                        <small>
                          Person #{candidate.personTrackId} associated · {candidate.stationary ? "stationary" : "timer restarted"}
                        </small>
                      </span>
                      <progress max="1" value={candidate.progress} />
                      <b>{Math.min(candidate.requiredSeconds, Math.round(candidate.elapsedSeconds))}/{candidate.requiredSeconds}s</b>
                    </div>
                  ))}
                </div>
              )}
              <div className={`capture-processor-note ${processorState}`}>
                <Activity size={17} />
                <p>{processorMessage}</p>
              </div>
              {detections.length > 0 && (
                <div className="capture-detection-summary" role="status" aria-live="polite">
                  <strong>Latest detections</strong>
                  <div>
                    {detections.slice(0, 6).map((detection, index) => (
                      <span key={`${detection.classId}-summary-${index}`}>
                        {detection.inRestrictedZone ? "Restricted · " : ""}{detection.label}{detection.trackId !== null ? ` #${detection.trackId}` : ""} {Math.round(detection.confidence * 100)}%
                      </span>
                    ))}
                  </div>
                  {modelName && <small>Model: {modelName}</small>}
                </div>
              )}
              <details className="capture-advanced">
                <summary className="focus-ring">Processor connection</summary>
                <label className="form-field">
                  <span>Processor URL</span>
                  <input
                    type="url"
                    inputMode="url"
                    value={processorUrl}
                    onChange={(event) => updateProcessorUrl(event.target.value)}
                  />
                  <small>Use the laptop&apos;s LAN IP when this camera runs on a phone.</small>
                </label>
              </details>
              <p className="capture-heartbeat-note">Detection frames are sent locally once per second. One private preview frame is overwritten every two seconds; only confirmed incident evidence is retained.</p>
              <button className="capture-disconnect-button focus-ring" type="button" onClick={() => void disconnect()}>
                <Unplug size={18} /> Disconnect device
              </button>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
