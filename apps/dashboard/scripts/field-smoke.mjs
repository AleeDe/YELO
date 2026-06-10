import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

async function loadEnv() {
  const text = await fs.readFile(new URL("../.env.local", import.meta.url), "utf8");
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

async function checkInference(url) {
  const response = await fetch(`${url.replace(/\/$/, "")}/health`, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Inference health returned HTTP ${response.status}.`);
  const health = await response.json();
  if (health.status !== "ready") throw new Error("Inference service is not ready.");
  if (!health.modelReady) throw new Error(`YOLO model is unavailable: ${health.modelError ?? "unknown error"}`);
  if (!health.eventReportingReady) throw new Error("Event reporting is not configured.");
  return health;
}

async function checkRealtime(url, key) {
  const first = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const second = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const topic = `field-smoke:${crypto.randomUUID()}`;
  const sender = first.channel(topic, { config: { broadcast: { ack: true } } });
  const receiver = second.channel(topic);

  return new Promise((resolve, reject) => {
    let sent = false;
    const timeout = setTimeout(() => finish(new Error("Realtime Broadcast timed out.")), 10_000);

    async function finish(error) {
      clearTimeout(timeout);
      await Promise.allSettled([
        first.removeChannel(sender),
        second.removeChannel(receiver),
      ]);
      if (error) reject(error);
      else resolve(true);
    }

    receiver
      .on("broadcast", { event: "smoke" }, ({ payload }) => {
        if (payload?.nonce === topic) void finish();
      })
      .subscribe((receiverStatus) => {
        if (receiverStatus !== "SUBSCRIBED") return;
        sender.subscribe(async (senderStatus) => {
          if (senderStatus !== "SUBSCRIBED" || sent) return;
          sent = true;
          const result = await sender.send({
            type: "broadcast",
            event: "smoke",
            payload: { nonce: topic },
          });
          if (result !== "ok") void finish(new Error(`Realtime send returned ${result}.`));
        });
      });
  });
}

const env = await loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const inferenceUrl = env.NEXT_PUBLIC_YELO_INFERENCE_URL ?? "http://127.0.0.1:8000";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
}

const health = await checkInference(inferenceUrl);
await checkRealtime(supabaseUrl, supabaseKey);

console.log(JSON.stringify({
  status: "passed",
  inference: {
    model: health.modelName,
    device: health.modelDevice,
    tracker: health.tracker,
    activeCameras: health.activeCameras,
    activeTrackers: health.activeTrackers,
  },
  realtimeSignaling: "passed",
}, null, 2));

process.exit(0);
