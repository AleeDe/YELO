"use client";

import { useState } from "react";
import { Bell, Building2, Database, Download, KeyRound, LockKeyhole, Save, Shield, SlidersHorizontal, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui";

const settingsNav = [
  { id: "profile", icon: Building2, label: "Society profile" },
  { id: "notifications", icon: Bell, label: "Notifications" },
  { id: "detection", icon: SlidersHorizontal, label: "Detection defaults" },
  { id: "privacy", icon: Shield, label: "Privacy and retention" },
  { id: "security", icon: LockKeyhole, label: "Security" },
  { id: "export", icon: Database, label: "Data export" },
] as const;

type TabId = (typeof settingsNav)[number]["id"];

function Toggle({ title, detail, checked = false }: { title: string; detail: string; checked?: boolean }) {
  return <label><span><strong>{title}</strong><small>{detail}</small></span><input type="checkbox" defaultChecked={checked} /></label>;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const activeLabel = settingsNav.find((item) => item.id === activeTab)?.label;

  return (
    <>
      <PageHeader eyebrow="Configuration" title="Settings" description="Manage society details, defaults, privacy, and notification behavior." />
      <div className="settings-layout">
        <label className="mobile-settings-select">
          <span>Settings section</span>
          <select value={activeTab} onChange={(event) => setActiveTab(event.target.value as TabId)}>
            {settingsNav.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
          </select>
        </label>
        <nav className="settings-nav" aria-label="Settings sections">
          {settingsNav.map((item) => {
            const Icon = item.icon;
            return <button id={`tab-${item.id}`} role="tab" aria-selected={activeTab === item.id} aria-controls={`panel-${item.id}`} className={`settings-nav-item focus-ring ${activeTab === item.id ? "active" : ""}`} onClick={() => setActiveTab(item.id)} key={item.id}><Icon size={19} /><span>{item.label}</span></button>;
          })}
        </nav>
        <div className="settings-content" role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} tabIndex={0}>
          {activeTab === "profile" && <>
            <section className="panel settings-section">
              <div className="settings-heading"><p className="eyebrow">Organization</p><h2>Society profile</h2><p>This information appears in camera and incident context.</p></div>
              <div className="form-grid">
                <label className="form-field"><span>Society name</span><input type="text" defaultValue="Green Residency" /></label>
                <label className="form-field"><span>URL identifier</span><input type="text" defaultValue="green-residency" /></label>
                <label className="form-field full-field"><span>Address</span><input type="text" defaultValue="Main Boulevard, Lahore" /></label>
                <label className="form-field"><span>Timezone</span><select defaultValue="Asia/Karachi"><option>Asia/Karachi</option><option>UTC</option></select></label>
                <label className="form-field"><span>Primary contact</span><input type="email" defaultValue="admin@greenresidency.pk" /></label>
              </div>
              <div className="settings-save"><p role="status">No unsaved changes</p><button className="primary-button focus-ring"><Save size={18} /> Save profile</button></div>
            </section>
            <section className="panel settings-section danger-section"><div><p className="eyebrow">Danger zone</p><h2>Disable society workspace</h2><p>This pauses processing and member access while retaining existing evidence.</p></div><button className="danger-button focus-ring">Disable workspace</button></section>
          </>}

          {activeTab === "notifications" && <section className="panel settings-section">
            <div className="settings-heading"><p className="eyebrow">Communication</p><h2>Alert preferences</h2><p>Choose which events deserve attention without creating notification fatigue.</p></div>
            <div className="toggle-list"><Toggle title="New possible incident" detail="Notify operators when an event enters review." checked /><Toggle title="Camera goes offline" detail="Notify after five minutes without a heartbeat." checked /><Toggle title="Weekly performance summary" detail="Send one digest every Monday morning." /><Toggle title="Resolved incident updates" detail="Notify the original reviewer when status changes." /></div>
            <div className="settings-save"><p>Delivery: dashboard and email</p><button className="primary-button focus-ring"><Save size={18} /> Save notifications</button></div>
          </section>}

          {activeTab === "detection" && <section className="panel settings-section">
            <div className="settings-heading"><p className="eyebrow">AI behavior</p><h2>Detection defaults</h2><p>New cameras inherit these values; individual cameras can override them.</p></div>
            <div className="form-grid">
              <label className="form-field"><span>Confidence threshold</span><select defaultValue="50"><option value="40">40% - more sensitive</option><option value="50">50% - balanced</option><option value="65">65% - fewer alerts</option></select></label>
              <label className="form-field"><span>Confirmation delay</span><select defaultValue="5"><option value="3">3 seconds</option><option value="5">5 seconds</option><option value="10">10 seconds</option></select></label>
              <label className="form-field"><span>Event cooldown</span><select defaultValue="30"><option value="15">15 seconds</option><option value="30">30 seconds</option><option value="60">60 seconds</option></select></label>
              <label className="form-field"><span>Default model</span><select><option>YELO Waste v1</option></select></label>
            </div>
            <div className="toggle-list"><Toggle title="Require person association" detail="Only flag waste that separates from a tracked person." checked /><Toggle title="Store short evidence clips" detail="Keep five seconds before and after a possible event." checked /></div>
            <div className="settings-save"><p>Applies to future cameras</p><button className="primary-button focus-ring"><Save size={18} /> Save defaults</button></div>
          </section>}

          {activeTab === "privacy" && <section className="panel settings-section">
            <div className="settings-heading"><p className="eyebrow">Data responsibility</p><h2>Privacy and retention</h2><p>Minimize stored footage and make retention behavior explicit.</p></div>
            <div className="form-grid"><label className="form-field"><span>Evidence retention</span><select defaultValue="30"><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select></label><label className="form-field"><span>Audit log retention</span><select defaultValue="365"><option value="180">180 days</option><option value="365">1 year</option></select></label></div>
            <div className="toggle-list"><Toggle title="Store incident evidence only" detail="Do not upload continuous camera footage." checked /><Toggle title="Blur faces in exported reports" detail="Apply privacy masking before downloads." checked /><Toggle title="Allow evidence downloads" detail="Society administrators can download original evidence." /></div>
            <div className="settings-save"><p>Human review remains required</p><button className="primary-button focus-ring"><Save size={18} /> Save privacy settings</button></div>
          </section>}

          {activeTab === "security" && <section className="panel settings-section">
            <div className="settings-heading"><p className="eyebrow">Account protection</p><h2>Security</h2><p>Control sessions, device access, and stronger authentication.</p></div>
            <div className="security-cards"><article><KeyRound size={21} /><div><strong>Multi-factor authentication</strong><p>Require a second step for administrators.</p></div><button className="secondary-button focus-ring">Configure</button></article><article><LockKeyhole size={21} /><div><strong>Active sessions</strong><p>3 browser or mobile sessions are signed in.</p></div><button className="secondary-button focus-ring">Review</button></article></div>
            <div className="toggle-list"><Toggle title="Require MFA for administrators" detail="Operators may continue using password sign-in." /><Toggle title="Expire inactive sessions" detail="Sign out sessions after 8 hours of inactivity." checked /></div>
            <div className="settings-save"><p>Last security review: today</p><button className="primary-button focus-ring"><Save size={18} /> Save security</button></div>
          </section>}

          {activeTab === "export" && <section className="panel settings-section">
            <div className="settings-heading"><p className="eyebrow">Portability</p><h2>Data export</h2><p>Prepare society data for reports, evaluation, or backup.</p></div>
            <div className="export-options"><article><Download size={22} /><div><strong>Incident report</strong><p>CSV metadata with review status and camera context.</p></div><button className="secondary-button focus-ring">Export CSV</button></article><article><Upload size={22} /><div><strong>Evidence archive</strong><p>Confirmed incident images with a manifest file.</p></div><button className="secondary-button focus-ring">Prepare archive</button></article><article><Database size={22} /><div><strong>Complete society export</strong><p>Society profile, cameras, zones, members, and audit logs.</p></div><button className="secondary-button focus-ring">Request export</button></article></div>
          </section>}

          <p className="settings-section-status" role="status">Showing {activeLabel}</p>
        </div>
      </div>
    </>
  );
}
