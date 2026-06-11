import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Camera,
  ClipboardCheck,
  FileText,
  KeyRound,
  MapPin,
  ScanSearch,
  ShieldCheck,
  Smartphone,
  Users,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "YELO | How it works",
  description: "A walkthrough of every YELO activity from camera setup to incident review.",
};

const steps = [
  {
    icon: Camera,
    title: "1. Register a camera",
    body: "Go to Cameras → Register camera. Choose the owning society, the source type (mobile phone, webcam, CCTV, or recorded video), and give it a clear name and location. YELO then shows a one-time device token.",
    note: "The token is shown only once and stored as a hash. If it is lost, open the camera page and use Regenerate token.",
  },
  {
    icon: Smartphone,
    title: "2. Pair the capture device",
    body: "Open YELO Capture on the phone or laptop that will act as the camera, paste the token, and select Connect camera. Allow camera permission, then press Start camera and keep the page open.",
    note: "The capture page sends one detection frame per second to the processing gateway and a private preview frame every two seconds.",
  },
  {
    icon: MapPin,
    title: "3. Draw restricted zones",
    body: "On the camera page, add a restricted zone by tapping points around the area where waste must not be placed. A zone needs at least three points and can be paused or edited at any time.",
    note: "Detection only confirms events for objects whose ground point falls inside an active zone.",
  },
  {
    icon: ScanSearch,
    title: "4. AI watches for littering",
    body: "The YOLO model tracks people and supported waste objects (bottles, cups, bags, food waste). When a waste object appears inside a zone with a person nearby and stays still for the configured confirmation delay, a possible littering event is created.",
    note: "Detections are suggestions with a confidence score — never automatic verdicts.",
  },
  {
    icon: Bell,
    title: "5. Get notified",
    body: "Confirmed possible events appear instantly in the Notifications panel and in the Incidents list, together with one evidence image, the camera, zone, time, and AI confidence.",
    note: "Continuous video is never stored — only the single evidence frame of a confirmed event.",
  },
  {
    icon: ClipboardCheck,
    title: "6. Review and decide",
    body: "Open the incident, inspect the evidence, and record an outcome: Confirm incident, Mark false alert, or Keep under review. The decision, reviewer, and time are saved, and the status updates everywhere.",
    note: "A human decision is always required. The AI note on each incident reminds reviewers that confidence is not proof.",
  },
  {
    icon: Video,
    title: "7. Monitor live",
    body: "The camera page shows near real-time video over a direct WebRTC connection when possible, and automatically falls back to a sampled preview (one frame every two seconds) when a direct connection cannot be made.",
    note: "The badge on the preview tells you which mode is active.",
  },
  {
    icon: BarChart3,
    title: "8. Track trends",
    body: "Analytics summarises incidents over time, outcomes (confirmed vs false alerts), and the most affected locations, so the society can target cleaning and signage.",
    note: "Use the period selector to compare weeks or months.",
  },
] as const;

const roles = [
  {
    icon: ShieldCheck,
    name: "Society administrator",
    detail: "Manages one society: cameras, zones, incidents, members, analytics, and settings.",
  },
  {
    icon: ClipboardCheck,
    name: "Operator",
    detail: "Reviews the incident queue and camera health for their assigned society.",
  },
  {
    icon: Users,
    name: "Super administrator",
    detail: "Oversees the whole platform: societies, camera fleet, platform policy, and administrators.",
  },
] as const;

export default function GuidePage() {
  return (
    <>
      <PageHeader
        eyebrow="User guide"
        title="How YELO works"
        description="Every activity in the system, from camera setup to a reviewed incident."
      />

      <section className="panel guide-roles" aria-labelledby="guide-roles-title">
        <h2 id="guide-roles-title">Who does what</h2>
        <div className="guide-role-grid">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <article key={role.name}>
                <span aria-hidden="true"><Icon size={21} /></span>
                <div><strong>{role.name}</strong><p>{role.detail}</p></div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="guide-steps" aria-label="Workflow steps">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <article className="panel guide-step" key={step.title}>
              <span className="guide-step-icon" aria-hidden="true"><Icon size={22} /></span>
              <div>
                <h2>{step.title}</h2>
                <p>{step.body}</p>
                <p className="guide-step-note"><AlertTriangle size={15} aria-hidden="true" /> {step.note}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="panel guide-extras" aria-labelledby="guide-extras-title">
        <h2 id="guide-extras-title">Good to know</h2>
        <ul>
          <li><KeyRound size={17} aria-hidden="true" /> <strong>Lost camera token?</strong> Open the camera page and choose Regenerate token — the old token stops working and the camera re-pairs with the new one.</li>
          <li><Bell size={17} aria-hidden="true" /> <strong>Notifications</strong> live in the sidebar (or the bell in the mobile header) and link straight to the incident.</li>
          <li><Users size={17} aria-hidden="true" /> <strong>Members</strong> are invited by email from the Members page; new members accept the terms when activating their account.</li>
          <li><FileText size={17} aria-hidden="true" /> <strong>Privacy:</strong> frames are processed in memory, previews are overwritten every two seconds, and only confirmed incident evidence is kept. Read the full <Link href="/legal">Privacy Policy &amp; Terms</Link>.</li>
        </ul>
      </section>
    </>
  );
}
