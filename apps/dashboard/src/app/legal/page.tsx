import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "YELO | Privacy & Terms",
  description: "YELO privacy policy and terms & conditions.",
};

export default function LegalPage() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link href="/auth/sign-in" className="back-link focus-ring"><ArrowLeft size={18} /> Back to sign in</Link>
        <div className="legal-brand"><span aria-hidden="true">Y</span><strong>YELO</strong></div>
        <p className="eyebrow">Legal</p>
        <h1>Privacy Policy &amp; Terms of Use</h1>
        <p className="page-subtitle">How YELO handles your data, and the rules for using the service. Last updated 11 June 2026.</p>
        <nav className="legal-toc" aria-label="Sections">
          <a href="#privacy" className="focus-ring"><ShieldCheck size={17} /> Privacy Policy</a>
          <a href="#terms" className="focus-ring"><FileText size={17} /> Terms &amp; Conditions</a>
        </nav>
      </header>

      <article id="privacy" className="panel legal-section">
        <h2><ShieldCheck size={22} /> Privacy Policy</h2>

        <h3>1. What YELO is</h3>
        <p>YELO is an AI-assisted monitoring system that helps residential societies detect possible littering in shared spaces. Cameras send frames to a detection model; possible incidents are always reviewed and decided by a human administrator.</p>

        <h3>2. Information we collect</h3>
        <ul>
          <li><strong>Account data</strong> — your name, email address, and role (administrator or operator), created through an administrator invitation.</li>
          <li><strong>Camera data</strong> — camera names, locations, configuration, and restricted-zone definitions registered by your society.</li>
          <li><strong>Incident data</strong> — detection events (object class, confidence, time, camera) and a single evidence image for events that the system confirms.</li>
          <li><strong>Activity data</strong> — notifications sent to you and audit logs of administrative actions (for example camera registration or token rotation).</li>
        </ul>

        <h3>3. How camera video is handled</h3>
        <ul>
          <li>Detection frames are processed <strong>in memory</strong> and are not stored as continuous video. A short rolling window (about one minute) is kept in memory only, and is discarded unless an event is confirmed.</li>
          <li>One private preview frame per camera is kept for live monitoring and is <strong>overwritten roughly every two seconds</strong>.</li>
          <li>For a <strong>confirmed littering event</strong>, YELO retains the evidence image and a short clip covering roughly <strong>one minute before and one minute after</strong> the event, so reviewers can see the person involved. Both are kept in private storage accessible to authorised society staff.</li>
          <li>Camera device tokens are stored only as <strong>SHA-256 hashes</strong>; YELO cannot read the original token after it is shown once.</li>
        </ul>

        <h3>4. AI decisions</h3>
        <p>AI detections are <strong>suggestions, not proof</strong>. Every possible incident requires a human review decision (confirm, false alert, or keep under review). YELO does not take automated action against any person.</p>

        <h3>5. Who can see your data</h3>
        <p>Society data is isolated by role. Members of one society cannot access another society&apos;s cameras, incidents, or evidence. Platform administrators can access operational data for support and oversight.</p>

        <h3>6. Where data is stored</h3>
        <p>Account, camera, and incident records are stored with Supabase (authentication, database, and private storage). Detection inference runs on a processing gateway operated by your society; frames sent to it are not retained after processing.</p>

        <h3>7. Retention and deletion</h3>
        <ul>
          <li>Deleting a camera permanently removes its restricted zones, detection events, and evidence references.</li>
          <li>Account removal is handled by your society administrator or the platform administrator.</li>
          <li>You may request a copy or deletion of your personal data by contacting the operator below.</li>
        </ul>

        <h3>8. Contact</h3>
        <p>For privacy questions or requests, contact the operator at <a href="mailto:shiftdeploy@gmail.com">shiftdeploy@gmail.com</a>.</p>
      </article>

      <article id="terms" className="panel legal-section">
        <h2><FileText size={22} /> Terms &amp; Conditions</h2>

        <h3>1. Acceptance</h3>
        <p>By activating a YELO account or using the service you agree to these terms and to the privacy policy above. If you do not agree, do not activate the account.</p>

        <h3>2. Accounts and access</h3>
        <ul>
          <li>Accounts are created by invitation from a society or platform administrator.</li>
          <li>You are responsible for keeping your credentials and camera device tokens secure.</li>
          <li>Notify your administrator immediately if you believe an account or token is compromised; tokens can be rotated from the camera page.</li>
        </ul>

        <h3>3. Acceptable use</h3>
        <ul>
          <li>Use YELO only to monitor <strong>shared community areas</strong> that your society is authorised to monitor.</li>
          <li>Do not point cameras at private areas such as residences, windows, or anywhere people have a reasonable expectation of privacy.</li>
          <li>Comply with all local laws on CCTV and data protection, including any signage requirements.</li>
          <li>Do not attempt to bypass role restrictions, access another society&apos;s data, or misuse evidence images.</li>
        </ul>

        <h3>4. AI output</h3>
        <p>Detection results are probabilistic suggestions. The society is responsible for the fairness of decisions made after human review. YELO output must not be treated as legal proof of an offence.</p>

        <h3>5. Service availability</h3>
        <p>YELO is provided on an &quot;as is&quot; and &quot;as available&quot; basis. Detection requires the society&apos;s processing gateway and camera devices to be online; monitoring stops when they are off.</p>

        <h3>6. Liability</h3>
        <p>To the maximum extent permitted by law, the operator is not liable for indirect or consequential damages arising from use of the service, including missed detections or false alerts.</p>

        <h3>7. Changes</h3>
        <p>These terms may be updated as the service evolves. Material changes will be announced in the application, and continued use after a change constitutes acceptance.</p>

        <h3>8. Contact</h3>
        <p>Questions about these terms: <a href="mailto:shiftdeploy@gmail.com">shiftdeploy@gmail.com</a>.</p>
      </article>

      <footer className="legal-footer">
        <p>YELO · Clean spaces, clearly managed · Powered by ShiftDeploy</p>
      </footer>
    </main>
  );
}
