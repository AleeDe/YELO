import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  Plus,
  ServerCog,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { MetricCard, PageHeader, StatusPill } from "@/components/ui";

const societies = [
  { name: "Green Residency", plan: "Active", cameras: "11 / 12", incidents: 6, admin: "Ali Hassan", health: "Healthy" },
  { name: "Lake View Society", plan: "Active", cameras: "8 / 8", incidents: 3, admin: "Hira Malik", health: "Healthy" },
  { name: "Model Town Homes", plan: "Setup", cameras: "4 / 5", incidents: 5, admin: "Ahmed Raza", health: "Attention" },
];

export default function SuperAdminPage() {
  return (
    <>
      <PageHeader
        eyebrow="Platform administration"
        title="Platform overview"
        description="Monitor every society, camera, administrator, and AI processing service."
        action={<Link className="primary-button focus-ring" href="/super-admin/societies"><Plus size={20} /> Add society</Link>}
      />
      <div className="metric-grid analytics-metrics">
        <MetricCard label="Active societies" value="3" detail="1 completing setup" tone="success" icon={Building2} />
        <MetricCard label="Registered cameras" value="25" detail="23 currently online" tone="neutral" icon={Camera} />
        <MetricCard label="Platform incidents" value="14" detail="Awaiting human review" tone="warning" icon={AlertTriangle} />
        <MetricCard label="Active users" value="9" detail="3 admins and 6 operators" tone="success" icon={Users} />
      </div>

      <div className="platform-grid">
        <section className="panel platform-societies">
          <div className="panel-heading">
            <div><p className="eyebrow">Tenant health</p><h2>Societies</h2></div>
            <Link href="/super-admin/societies" className="text-link focus-ring">Manage all <ArrowRight size={17} /></Link>
          </div>
          <div className="society-health-list">
            {societies.map((society) => (
              <article key={society.name}>
                <span className="society-avatar large" aria-hidden="true">{society.name.split(" ").map((word) => word[0]).join("")}</span>
                <div><h3>{society.name}</h3><p>Admin: {society.admin}</p></div>
                <div className="society-stat"><small>Cameras</small><strong>{society.cameras}</strong></div>
                <div className="society-stat"><small>Needs review</small><strong>{society.incidents}</strong></div>
                <StatusPill status={society.health === "Healthy" ? "Active" : "Needs review"} />
                <button className="table-action focus-ring">Open</button>
              </article>
            ))}
          </div>
        </section>

        <aside className="platform-side">
          <section className="panel service-health">
            <div className="panel-heading"><div><p className="eyebrow">Infrastructure</p><h2>Service health</h2></div><CheckCircle2 className="healthy-icon" size={23} /></div>
            <ul>
              <li><span className="service-icon online"><ServerCog size={18} /></span><div><strong>Supabase backend</strong><small>Operational</small></div><StatusPill status="Online" /></li>
              <li><span className="service-icon online"><Wifi size={18} /></span><div><strong>Realtime alerts</strong><small>Last event 2m ago</small></div><StatusPill status="Online" /></li>
              <li><span className="service-icon warning"><WifiOff size={18} /></span><div><strong>Camera connections</strong><small>2 devices offline</small></div><StatusPill status="Needs review" /></li>
            </ul>
          </section>
          <section className="panel admin-actions">
            <p className="eyebrow">Common tasks</p><h2>Platform actions</h2>
            <Link href="/super-admin/societies" className="action-row focus-ring"><Building2 size={19} /><span><strong>Create society</strong><small>Set up a new tenant workspace</small></span><ArrowRight size={17} /></Link>
            <Link href="/members" className="action-row focus-ring"><Users size={19} /><span><strong>Manage users</strong><small>Review platform access</small></span><ArrowRight size={17} /></Link>
            <Link href="/settings" className="action-row focus-ring"><ServerCog size={19} /><span><strong>Platform settings</strong><small>Security and service defaults</small></span><ArrowRight size={17} /></Link>
          </section>
        </aside>
      </div>
    </>
  );
}

