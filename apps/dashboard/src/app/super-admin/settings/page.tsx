"use client";

import { BellRing, Database, KeyRound, LockKeyhole, Save, ServerCog, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/ui";

const sections = [
  { id: "security", label: "Security", icon: LockKeyhole },
  { id: "services", label: "Services", icon: ServerCog },
  { id: "notifications", label: "Alerts", icon: BellRing },
  { id: "retention", label: "Data governance", icon: Database },
] as const;

type SectionId = (typeof sections)[number]["id"];

export default function PlatformSettingsPage() {
  const [active, setActive] = useState<SectionId>("security");
  return <>
    <PageHeader eyebrow="Platform governance" title="Platform settings" description="Set global security, service, alert, and retention policy across YELO. Society-specific configuration is managed inside each society." />
    <div className="settings-layout platform-settings-layout">
      <label className="mobile-settings-select"><span>Platform setting</span><select value={active} onChange={(event) => setActive(event.target.value as SectionId)}>{sections.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <nav className="settings-nav" aria-label="Platform settings sections">{sections.map((item) => { const Icon = item.icon; return <button key={item.id} className={`settings-nav-item focus-ring ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}><Icon size={19} /><span>{item.label}</span></button>; })}</nav>
      <div className="settings-content">
        {active === "security" && <section className="panel settings-section">
          <div className="settings-heading"><p className="eyebrow">Access policy</p><h2>Administrator security</h2><p>Global controls for privileged platform accounts.</p></div>
          <div className="policy-cards"><article><span><KeyRound size={20} /></span><div><strong>Require MFA for Super Admins</strong><p>Planned after the core invitation workflow.</p></div><input aria-label="Require MFA for Super Admins" type="checkbox" disabled /></article><article><span><ShieldCheck size={20} /></span><div><strong>Audit privileged changes</strong><p>Database audit logging is enabled for platform actions.</p></div><input aria-label="Audit privileged changes" type="checkbox" defaultChecked disabled /></article></div>
        </section>}
        {active === "services" && <section className="panel settings-section">
          <div className="settings-heading"><p className="eyebrow">Infrastructure</p><h2>Detection services</h2><p>Global defaults for camera processing and health monitoring.</p></div>
          <div className="form-grid"><label className="form-field"><span>Camera offline threshold</span><select defaultValue="5" disabled><option value="5">5 minutes</option></select></label><label className="form-field"><span>Default processing state</span><select defaultValue="enabled" disabled><option value="enabled">Enabled</option></select></label></div>
          <div className="settings-save"><p>Service configuration API is not connected yet</p><button className="primary-button" disabled><Save size={18} /> Save service policy</button></div>
        </section>}
        {active === "notifications" && <section className="panel settings-section">
          <div className="settings-heading"><p className="eyebrow">Platform attention</p><h2>Escalation rules</h2><p>Define which cross-society conditions require Super Admin attention.</p></div>
          <div className="policy-cards"><article><span><BellRing size={20} /></span><div><strong>Society has no administrator</strong><p>Show onboarding risk in the command center.</p></div><input aria-label="Alert when society has no administrator" type="checkbox" defaultChecked disabled /></article><article><span><ServerCog size={20} /></span><div><strong>Multiple cameras offline</strong><p>Escalate broad service degradation.</p></div><input aria-label="Alert when multiple cameras are offline" type="checkbox" defaultChecked disabled /></article></div>
        </section>}
        {active === "retention" && <section className="panel settings-section">
          <div className="settings-heading"><p className="eyebrow">Data responsibility</p><h2>Global retention guardrails</h2><p>Platform-wide limits that society policies cannot exceed.</p></div>
          <div className="form-grid"><label className="form-field"><span>Maximum evidence retention</span><select defaultValue="90" disabled><option value="90">90 days</option></select></label><label className="form-field"><span>Audit retention</span><select defaultValue="365" disabled><option value="365">1 year</option></select></label></div>
          <div className="settings-save"><p>Governance storage policy is planned</p><button className="primary-button" disabled><Save size={18} /> Save retention policy</button></div>
        </section>}
      </div>
    </div>
  </>;
}
