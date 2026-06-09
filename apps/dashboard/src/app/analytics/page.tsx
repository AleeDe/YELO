import { AlertTriangle, BarChart3, CalendarDays, CheckCircle2, ChevronDown, Clock3, Download, TrendingDown } from "lucide-react";
import { MetricCard, PageHeader } from "@/components/ui";

const bars = [42, 55, 38, 72, 64, 83, 58, 76, 91, 68, 54, 79, 62, 88];
const locations = [
  { name: "Commercial lane", value: 38, percent: 82 },
  { name: "Block C community park", value: 27, percent: 64 },
  { name: "Society entrance", value: 19, percent: 48 },
  { name: "Family park", value: 12, percent: 32 },
];

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Performance insights"
        title="Analytics"
        description="Understand incident patterns, camera performance, and review quality."
        action={<button className="secondary-button focus-ring"><Download size={18} /> Export summary</button>}
      />
      <div className="period-bar">
        <div><button className="period-option active">7 days</button><button className="period-option">30 days</button><button className="period-option">90 days</button></div>
        <button className="filter-button focus-ring"><CalendarDays size={18} /> 3–9 June 2026 <ChevronDown size={16} /></button>
      </div>
      <div className="metric-grid analytics-metrics">
        <MetricCard label="Possible incidents" value="128" detail="12% lower than last week" tone="warning" icon={AlertTriangle} />
        <MetricCard label="Confirmed" value="84" detail="66% confirmation rate" tone="success" icon={CheckCircle2} />
        <MetricCard label="Median review time" value="1m 42s" detail="18 seconds faster" tone="neutral" icon={Clock3} />
        <MetricCard label="False-alert rate" value="18%" detail="Target is below 15%" tone="warning" icon={TrendingDown} />
      </div>
      <div className="analytics-grid">
        <section className="panel chart-panel">
          <div className="panel-heading"><div><p className="eyebrow">Daily volume</p><h2>Incidents over time</h2></div><span className="chart-legend"><i /> Possible incidents</span></div>
          <div className="bar-chart" role="img" aria-label="Incident volume across the last fourteen days">
            {bars.map((height, index) => <div className="bar-column" key={index}><span style={{ height: `${height}%` }} /><small>{index % 2 === 0 ? `${index + 26}` : ""}</small></div>)}
          </div>
        </section>
        <section className="panel chart-panel">
          <div className="panel-heading"><div><p className="eyebrow">Outcome quality</p><h2>Review outcomes</h2></div></div>
          <div className="donut-layout">
            <div className="donut-chart"><div><strong>128</strong><span>Total</span></div></div>
            <ul className="legend-list">
              <li><span className="legend-dot confirmed" /><div><strong>Confirmed</strong><small>84 incidents · 66%</small></div></li>
              <li><span className="legend-dot false" /><div><strong>False alerts</strong><small>23 incidents · 18%</small></div></li>
              <li><span className="legend-dot pending" /><div><strong>Pending review</strong><small>21 incidents · 16%</small></div></li>
            </ul>
          </div>
        </section>
        <section className="panel locations-panel">
          <div className="panel-heading"><div><p className="eyebrow">Hotspots</p><h2>Incidents by location</h2></div><button className="text-link focus-ring">View details</button></div>
          <div className="location-bars">
            {locations.map((location) => <div key={location.name}><div><strong>{location.name}</strong><span>{location.value}</span></div><div className="progress-track"><span style={{ width: `${location.percent}%` }} /></div></div>)}
          </div>
        </section>
        <section className="panel insight-panel">
          <div className="insight-icon"><BarChart3 size={23} /></div>
          <div><p className="eyebrow">Weekly insight</p><h2>Commercial lane needs attention</h2><p>Thirty percent of this week’s confirmed incidents came from one location, mostly between 6 PM and 9 PM.</p><button className="secondary-button focus-ring">Open related incidents</button></div>
        </section>
      </div>
    </>
  );
}

