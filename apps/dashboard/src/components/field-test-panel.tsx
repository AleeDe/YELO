"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Check,
  Circle,
  FlaskConical,
  LoaderCircle,
  Play,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { WebRtcState } from "@/components/live-webrtc";
import { inferenceUrl } from "@/lib/supabase/config";

type AutomaticResult = {
  id: string;
  label: string;
  detail: string;
  passed: boolean;
};

const manualSteps = [
  {
    id: "movement",
    title: "Live movement is smooth",
    detail: "Move in front of the camera and confirm the dashboard follows in near real time.",
  },
  {
    id: "zone",
    title: "Restricted zone aligns",
    detail: "Confirm the polygon remains over the same physical area while the camera is fixed.",
  },
  {
    id: "timer",
    title: "Littering timer triggers",
    detail: "Stand near the zone, place a bottle or cup inside it, and leave it still for the configured delay.",
  },
  {
    id: "incident",
    title: "Incident reaches review",
    detail: "Confirm a notification, incident row, and private evidence image appear.",
  },
] as const;

export function FieldTestPanel({
  client,
  cameraId,
  cameraStatus,
  lastSeenAt,
  latestFrameAt,
  zoneCount,
  webRtcState,
}: {
  client: SupabaseClient;
  cameraId: string;
  cameraStatus: string;
  lastSeenAt: string | null;
  latestFrameAt: string | null;
  zoneCount: number;
  webRtcState: WebRtcState;
}) {
  const storageKey = `yelo-field-test:${cameraId}`;
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({});
  const [automaticResults, setAutomaticResults] = useState<AutomaticResult[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;
      try {
        setManualChecks(JSON.parse(saved));
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [storageKey]);

  const manualComplete = manualSteps.filter((step) => manualChecks[step.id]).length;
  const automaticPassed = automaticResults.filter((result) => result.passed).length;
  const allPassed =
    automaticResults.length > 0 &&
    automaticPassed === automaticResults.length &&
    manualComplete === manualSteps.length;

  const progress = useMemo(() => {
    const total = automaticResults.length + manualSteps.length;
    return total ? Math.round(((automaticPassed + manualComplete) / total) * 100) : 0;
  }, [automaticPassed, automaticResults.length, manualComplete]);

  function toggleManual(id: string) {
    setManualChecks((current) => {
      const next = { ...current, [id]: !current[id] };
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  async function runDiagnostics() {
    setRunning(true);
    const now = Date.now();
    const heartbeatAge = lastSeenAt
      ? Math.round((now - new Date(lastSeenAt).getTime()) / 1000)
      : null;
    const frameAge = latestFrameAt
      ? Math.round((now - new Date(latestFrameAt).getTime()) / 1000)
      : null;
    let health: Record<string, unknown> | null = null;
    let latestIncident = false;

    try {
      const response = await fetch(`${inferenceUrl.replace(/\/$/, "")}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (response.ok) health = await response.json();
    } catch {
      health = null;
    }

    const { data } = await client
      .from("detection_events")
      .select("id")
      .eq("camera_id", cameraId)
      .order("detected_at", { ascending: false })
      .limit(1);
    latestIncident = Boolean(data?.length);

    setAutomaticResults([
      {
        id: "heartbeat",
        label: "Camera heartbeat",
        detail: heartbeatAge === null ? "No heartbeat received." : `Last contact ${Math.max(0, heartbeatAge)} seconds ago.`,
        passed: cameraStatus === "online" && heartbeatAge !== null && heartbeatAge <= 40,
      },
      {
        id: "frame",
        label: "Sampled preview fallback",
        detail: frameAge === null ? "No preview frame uploaded." : `Latest frame ${Math.max(0, frameAge)} seconds old.`,
        passed: frameAge !== null && frameAge <= 10,
      },
      {
        id: "webrtc",
        label: "WebRTC live connection",
        detail: webRtcState === "connected" ? "Peer-to-peer video connected." : `Current state: ${webRtcState}.`,
        passed: webRtcState === "connected",
      },
      {
        id: "inference",
        label: "YOLO inference gateway",
        detail: health
          ? `${String(health.modelName)} on ${String(health.modelDevice)} · ${String(health.activeCameras)} active camera(s).`
          : `Gateway not reachable at ${inferenceUrl}.`,
        passed: health?.status === "ready" && health?.modelReady === true,
      },
      {
        id: "zone",
        label: "Restricted-zone configuration",
        detail: zoneCount ? `${zoneCount} active zone(s) available.` : "Create at least one restricted zone.",
        passed: zoneCount > 0,
      },
      {
        id: "event",
        label: "Incident persistence",
        detail: latestIncident ? "At least one incident exists for this camera." : "No incident has been generated yet.",
        passed: latestIncident,
      },
    ]);
    setLastRunAt(new Date());
    setRunning(false);
  }

  return (
    <section className="panel field-test-panel" aria-labelledby="field-test-title">
      <div className="field-test-heading">
        <div>
          <p className="eyebrow">Field validation</p>
          <h2 id="field-test-title">End-to-end camera test</h2>
          <p>Verify the complete camera, AI, zone, evidence, and alert workflow.</p>
        </div>
        <div className={`field-test-score ${allPassed ? "complete" : ""}`}>
          <strong>{progress}%</strong>
          <span>{allPassed ? "Ready" : "In progress"}</span>
        </div>
      </div>

      <div className="field-test-actions">
        <button className="primary-button focus-ring" type="button" disabled={running} onClick={() => void runDiagnostics()}>
          {running ? <LoaderCircle className="spin" size={18} /> : automaticResults.length ? <RefreshCw size={18} /> : <Play size={18} />}
          {running ? "Checking..." : automaticResults.length ? "Run checks again" : "Run automatic checks"}
        </button>
        {lastRunAt && <small>Last checked {lastRunAt.toLocaleTimeString()}</small>}
      </div>

      {automaticResults.length > 0 && (
        <div className="field-test-results">
          <h3>Automatic checks</h3>
          <div>
            {automaticResults.map((result) => (
              <article className={result.passed ? "passed" : "failed"} key={result.id}>
                <span>{result.passed ? <Check size={17} /> : <TriangleAlert size={17} />}</span>
                <div><strong>{result.label}</strong><p>{result.detail}</p></div>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="field-test-manual">
        <div><h3>Physical test</h3><span>{manualComplete}/{manualSteps.length} complete</span></div>
        <div>
          {manualSteps.map((step) => (
            <button
              className={`field-test-step focus-ring ${manualChecks[step.id] ? "checked" : ""}`}
              type="button"
              key={step.id}
              aria-pressed={Boolean(manualChecks[step.id])}
              onClick={() => toggleManual(step.id)}
            >
              <span>{manualChecks[step.id] ? <Check size={18} /> : <Circle size={18} />}</span>
              <span><strong>{step.title}</strong><small>{step.detail}</small></span>
            </button>
          ))}
        </div>
      </div>

      <div className="field-test-note">
        <FlaskConical size={19} />
        <p>Keep Capture open on the camera device. Run this panel from the administrator laptop while performing the physical steps.</p>
      </div>
    </section>
  );
}
