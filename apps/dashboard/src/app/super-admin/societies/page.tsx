import { Building2, MoreHorizontal, Plus, Search } from "lucide-react";
import { PageHeader, StatusPill } from "@/components/ui";

const societies = [
  { name: "Green Residency", slug: "green-residency", admin: "Ali Hassan", cameras: 12, members: 3, status: "Active", created: "3 Jun 2026" },
  { name: "Lake View Society", slug: "lake-view", admin: "Hira Malik", cameras: 8, members: 4, status: "Active", created: "5 Jun 2026" },
  { name: "Model Town Homes", slug: "model-town-homes", admin: "Ahmed Raza", cameras: 5, members: 2, status: "Setup", created: "8 Jun 2026" },
];

export default function SocietiesPage() {
  return (
    <>
      <PageHeader eyebrow="Platform tenants" title="Societies" description="Create society workspaces, assign administrators, and monitor onboarding." action={<button className="primary-button focus-ring"><Plus size={20} /> Add society</button>} />
      <section className="panel page-panel">
        <div className="toolbar"><label className="search-field"><Search size={19} /><span className="sr-only">Search societies</span><input type="search" placeholder="Search society or administrator" /></label></div>
        <div className="society-directory">
          {societies.map((society) => (
            <article key={society.slug}>
              <span className="directory-icon"><Building2 size={22} /></span>
              <div className="directory-name"><h2>{society.name}</h2><p>{society.slug}</p></div>
              <div><small>Administrator</small><strong>{society.admin}</strong></div>
              <div><small>Cameras</small><strong>{society.cameras}</strong></div>
              <div><small>Members</small><strong>{society.members}</strong></div>
              <StatusPill status={society.status === "Setup" ? "Needs review" : society.status} />
              <button className="icon-button focus-ring" aria-label={`More actions for ${society.name}`}><MoreHorizontal size={20} /></button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

