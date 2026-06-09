"use client";

import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Unplug,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

type CameraInfo = {
  id: string;
  name: string;
  location_label: string | null;
  source_type: string;
  status: string;
  last_seen_at: string | null;
  detection_enabled: boolean;
};

type DeviceAction = "pair" | "heartbeat" | "disconnect";
type FacingMode = "user" | "environment";

const tokenStorageKey = "yelo-camera-device-token";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [token, setToken] = useState("");
  const [camera, setCamera] = useState<CameraInfo | null>(null);
  const [pairing, setPairing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const restoreToken = window.setTimeout(() => {
      setToken(window.sessionStorage.getItem(tokenStorageKey) ?? "");
    }, 0);
    return () => {
      window.clearTimeout(restoreToken);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const callDevice = useCallback(async (action: DeviceAction, deviceToken: string) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("YELO is missing its Supabase public configuration.");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/camera-device`, {
      method: "POST",
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

  useEffect(() => {
    if (!streaming || !token) return;
    const interval = window.setInterval(() => void sendHeartbeat(), 25_000);
    return () => window.clearInterval(interval);
  }, [sendHeartbeat, streaming, token]);

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
      }
      setFacingMode(nextFacingMode);
      setStreaming(true);
      void sendHeartbeat();
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
    }
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

      <div className="capture-layout">
        <section className="capture-stage" aria-labelledby="capture-title">
          <div className="capture-stage-heading">
            <div>
              <p className="eyebrow">Monitoring source</p>
              <h1 id="capture-title">{camera?.name ?? "Connect this camera"}</h1>
              <p>{camera?.location_label ?? "Pair a registered YELO camera to begin the live preview."}</p>
            </div>
            {camera && (
              <span className="capture-secure-badge"><ShieldCheck size={18} /> Token verified</span>
            )}
          </div>

          <div className={`capture-video-frame ${streaming ? "is-live" : ""}`}>
            <video ref={videoRef} muted playsInline aria-label="Live camera preview" />
            {!streaming && (
              <div className="capture-video-empty">
                <span><CameraOff size={34} /></span>
                <strong>Camera preview is off</strong>
                <p>{camera ? "Start the camera when the device is positioned." : "Enter the one-time token first."}</p>
              </div>
            )}
            {streaming && <span className="capture-live-label"><i /> Live preview</span>}
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
              </dl>
              <p className="capture-heartbeat-note">YELO reports this device online every 25 seconds while the preview is running.</p>
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
