"use client";

import { useEffect, useState } from "react";

// Animated launch splash shown on every hard load (which, in the Capacitor
// app, is every app launch). The mark pops in, a sonar ring pulses outward
// (camera/monitoring motif), the wordmark rises, then the overlay fades into
// the app. Motion is fully disabled under prefers-reduced-motion.
export function AnimatedSplash() {
  const [phase, setPhase] = useState<"shown" | "leaving" | "gone">("shown");

  useEffect(() => {
    const hold = window.setTimeout(() => setPhase("leaving"), 1700);
    const remove = window.setTimeout(() => setPhase("gone"), 2250);
    return () => {
      window.clearTimeout(hold);
      window.clearTimeout(remove);
    };
  }, []);

  if (phase === "gone") return null;
  return (
    <div className={`app-splash ${phase === "leaving" ? "leaving" : ""}`} role="presentation" aria-hidden="true">
      <div className="app-splash-mark">Y</div>
      <strong className="app-splash-word">YELO</strong>
      <small className="app-splash-tagline">Clean spaces, clearly managed</small>
      <span className="app-splash-powered">Powered by ShiftDeploy</span>
    </div>
  );
}
