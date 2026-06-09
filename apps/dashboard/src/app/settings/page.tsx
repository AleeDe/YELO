import { Bell, Building2, Database, LockKeyhole, Save, Shield, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/ui";

const settingsNav = [
  { icon: Building2, label: "Society profile", active: true },
  { icon: Bell, label: "Notifications" },
  { icon: SlidersHorizontal, label: "Detection defaults" },
  { icon: Shield, label: "Privacy and retention" },
  { icon: LockKeyhole, label: "Security" },
  { icon: Database, label: "Data export" },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Settings" description="Manage society details, defaults, privacy, and notification behavior." />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {settingsNav.map((item) => { const Icon = item.icon; return <button className={`settings-nav-item focus-ring ${item.active ? "active" : ""}`} key={item.label}><Icon size={19} /><span>{item.label}</span></button>; })}
        </nav>
        <div className="settings-content">
          <section className="panel settings-section">
            <div className="settings-heading"><div><p className="eyebrow">Organization</p><h2>Society profile</h2><p>This information appears in camera and incident context.</p></div></div>
            <div className="form-grid">
              <label className="form-field"><span>Society name</span><input type="text" defaultValue="Green Residency" /></label>
              <label className="form-field"><span>URL identifier</span><input type="text" defaultValue="green-residency" /></label>
              <label className="form-field full-field"><span>Address</span><input type="text" defaultValue="Main Boulevard, Lahore" /></label>
              <label className="form-field"><span>Timezone</span><select defaultValue="Asia/Karachi"><option>Asia/Karachi</option><option>UTC</option></select></label>
              <label className="form-field"><span>Evidence retention</span><select defaultValue="30"><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select></label>
            </div>
            <div className="settings-save"><p role="status">No unsaved changes</p><button className="primary-button focus-ring"><Save size={18} /> Save changes</button></div>
          </section>
          <section className="panel settings-section">
            <div className="settings-heading"><div><p className="eyebrow">Communication</p><h2>Alert preferences</h2><p>Choose which events deserve attention without creating notification fatigue.</p></div></div>
            <div className="toggle-list">
              <label><span><strong>New possible incident</strong><small>Notify operators when an incident enters the review queue.</small></span><input type="checkbox" defaultChecked /></label>
              <label><span><strong>Camera goes offline</strong><small>Notify after a camera has missed heartbeats for five minutes.</small></span><input type="checkbox" defaultChecked /></label>
              <label><span><strong>Weekly summary</strong><small>Send one email summary every Monday morning.</small></span><input type="checkbox" /></label>
            </div>
          </section>
          <section className="panel settings-section danger-section">
            <div><p className="eyebrow">Danger zone</p><h2>Disable society workspace</h2><p>This pauses camera processing and prevents members from signing in. Existing evidence remains retained.</p></div>
            <button className="danger-button focus-ring">Disable workspace</button>
          </section>
        </div>
      </div>
    </>
  );
}
