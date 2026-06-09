import { Mail, MoreHorizontal, Plus, Search, ShieldCheck, UserCheck, Users } from "lucide-react";
import { members } from "@/lib/demo-data";
import { MetricCard, PageHeader, StatusPill } from "@/components/ui";

export default function MembersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Access management"
        title="Members"
        description="Invite operators and control who can review incidents or change camera settings."
        action={<button className="primary-button focus-ring"><Plus size={20} /> Invite member</button>}
      />
      <div className="metric-grid compact-metrics">
        <MetricCard label="Total members" value="3" detail="1 administrator, 2 operators" tone="neutral" icon={Users} />
        <MetricCard label="Active now" value="2" detail="Available for incident review" tone="success" icon={UserCheck} />
        <MetricCard label="Pending invites" value="1" detail="Invitation expires in 6 days" tone="warning" icon={Mail} />
      </div>
      <section className="panel page-panel">
        <div className="toolbar"><label className="search-field"><Search size={19} /><span className="sr-only">Search members</span><input type="search" placeholder="Search name or email" /></label></div>
        <div className="member-list">
          {members.map((member) => (
            <article className="member-row" key={member.email}>
              <span className="member-avatar" aria-hidden="true">{member.initials}</span>
              <div className="member-identity"><strong>{member.name}</strong><span>{member.email}</span></div>
              <div className="member-role"><ShieldCheck size={17} /><span>{member.role}</span></div>
              <StatusPill status={member.status} />
              <div className="member-activity"><small>Last active</small><span>{member.lastActive}</span></div>
              <button className="icon-button focus-ring" aria-label={`More actions for ${member.name}`}><MoreHorizontal size={20} /></button>
            </article>
          ))}
        </div>
      </section>
      <section className="panel permission-panel">
        <div><p className="eyebrow">Role guidance</p><h2>Keep permissions easy to understand</h2><p>Society administrators manage cameras, zones, members, and settings. Operators monitor cameras and review incidents but cannot change society access.</p></div>
        <button className="secondary-button focus-ring">View permission matrix</button>
      </section>
    </>
  );
}

