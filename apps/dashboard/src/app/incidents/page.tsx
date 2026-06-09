import Link from "next/link";
import { CalendarDays, Camera, ChevronDown, Download, Filter, Search } from "lucide-react";
import { incidents } from "@/lib/demo-data";
import { MetricCard, PageHeader, StatusPill } from "@/components/ui";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";

export default function IncidentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Human review"
        title="Incidents"
        description="Review AI-flagged events, record decisions, and track resolution."
        action={<button className="secondary-button focus-ring" type="button"><Download size={18} aria-hidden="true" /> Export report</button>}
      />
      <div className="metric-grid compact-metrics">
        <MetricCard label="Needs review" value="6" detail="Oldest: 43 minutes" tone="warning" icon={AlertTriangle} />
        <MetricCard label="Under review" value="2" detail="Assigned to 2 operators" tone="neutral" icon={Clock3} />
        <MetricCard label="Resolved this week" value="84" detail="18% false-alert rate" tone="success" icon={CheckCircle2} />
      </div>

      <section className="panel page-panel">
        <div className="toolbar" aria-label="Incident filters">
          <label className="search-field">
            <Search size={19} aria-hidden="true" />
            <span className="sr-only">Search incidents</span>
            <input type="search" placeholder="Search by ID, camera, or object" />
          </label>
          <button className="filter-button focus-ring" type="button"><Filter size={18} aria-hidden="true" /> All statuses <ChevronDown size={16} /></button>
          <button className="filter-button focus-ring" type="button"><Camera size={18} aria-hidden="true" /> All cameras <ChevronDown size={16} /></button>
          <button className="filter-button focus-ring" type="button"><CalendarDays size={18} aria-hidden="true" /> Last 7 days <ChevronDown size={16} /></button>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Incident</th><th>Source</th><th>Detected</th><th>Confidence</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead>
            <tbody>
              {incidents.map((incident) => (
                <tr key={incident.id}>
                  <td><strong>{incident.object}</strong><small>{incident.id} · {incident.zone}</small></td>
                  <td><strong>{incident.camera}</strong><small>{incident.location}</small></td>
                  <td><span>{incident.time}</span><small>{incident.date}</small></td>
                  <td><span className="confidence-value">{incident.confidence}%</span></td>
                  <td><StatusPill status={incident.status} /></td>
                  <td><Link className="table-action focus-ring" href={`/incidents/${incident.id}`}>Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination"><p>Showing 1–5 of 128 incidents</p><div><button className="page-button" disabled>Previous</button><button className="page-button focus-ring">Next</button></div></div>
      </section>
    </>
  );
}

