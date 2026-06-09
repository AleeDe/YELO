import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  LayoutDashboard,
  MapPin,
  MoreHorizontal,
  Plus,
  Settings,
  ShieldCheck,
  Users,
  Video,
  Wifi,
  WifiOff,
} from "lucide-react";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, href: "/", current: true },
  { label: "Incidents", icon: AlertTriangle, href: "#incidents" },
  { label: "Cameras", icon: Video, href: "#cameras" },
  { label: "Analytics", icon: BarChart3, href: "#analytics" },
  { label: "Members", icon: Users, href: "#members" },
  { label: "Settings", icon: Settings, href: "#settings" },
];

const metrics = [
  {
    label: "Needs review",
    value: "6",
    detail: "2 added in the last hour",
    tone: "warning",
    icon: AlertTriangle,
  },
  {
    label: "Cameras online",
    value: "11/12",
    detail: "92% available",
    tone: "success",
    icon: Wifi,
  },
  {
    label: "Resolved today",
    value: "18",
    detail: "Median review: 1m 42s",
    tone: "neutral",
    icon: CheckCircle2,
  },
];

const incidents = [
  {
    id: "YL-2048",
    camera: "Park north entrance",
    location: "Block C community park",
    object: "Plastic bottle",
    time: "2 minutes ago",
    confidence: "86%",
    status: "Needs review",
  },
  {
    id: "YL-2047",
    camera: "Market street 02",
    location: "Commercial lane",
    object: "Waste bag",
    time: "18 minutes ago",
    confidence: "81%",
    status: "Needs review",
  },
  {
    id: "YL-2046",
    camera: "Playground west",
    location: "Family park",
    object: "Paper cup",
    time: "43 minutes ago",
    confidence: "74%",
    status: "Under review",
  },
];

const cameraHealth = [
  {
    name: "Park north entrance",
    location: "Block C community park",
    status: "Online",
    seen: "Live now",
  },
  {
    name: "Market street 02",
    location: "Commercial lane",
    status: "Online",
    seen: "Live now",
  },
  {
    name: "Main gate mobile",
    location: "Society entrance",
    status: "Offline",
    seen: "Last seen 12m ago",
  },
];

function Brand() {
  return (
    <Link
      href="/"
      className="brand focus-ring"
      aria-label="YELO overview"
    >
      <span className="brand-mark" aria-hidden="true">
        Y
      </span>
      <span>
        <strong>YELO</strong>
        <small>Clean spaces, clearly managed</small>
      </span>
    </Link>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <Brand />

      <div className="society-switcher">
        <span className="eyebrow">Current society</span>
        <button className="society-button focus-ring" type="button">
          <span className="society-avatar" aria-hidden="true">
            GR
          </span>
          <span className="society-copy">
            <strong>Green Residency</strong>
            <small>Society administrator</small>
          </span>
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      </div>

      <nav className="desktop-nav">
        <span className="eyebrow nav-label">Workspace</span>
        <ul>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`nav-link focus-ring ${item.current ? "active" : ""}`}
                  aria-current={item.current ? "page" : undefined}
                >
                  <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.label === "Incidents" && (
                    <span className="nav-count" aria-label="6 incidents">
                      6
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-status">
        <div className="status-icon success" aria-hidden="true">
          <ShieldCheck size={20} />
        </div>
        <div>
          <strong>Detection service active</strong>
          <p>11 cameras are processing</p>
        </div>
      </div>

      <button className="user-menu focus-ring" type="button">
        <span className="user-avatar" aria-hidden="true">
          AH
        </span>
        <span>
          <strong>Ali Hassan</strong>
          <small>ali@example.com</small>
        </span>
        <MoreHorizontal size={20} aria-hidden="true" />
      </button>
    </aside>
  );
}

function MobileNavigation() {
  const mobileItems = navigation.slice(0, 3);
  return (
    <nav className="mobile-nav" aria-label="Mobile primary navigation">
      {mobileItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`mobile-nav-link focus-ring ${item.current ? "active" : ""}`}
            aria-current={item.current ? "page" : undefined}
          >
            <Icon size={21} aria-hidden="true" />
            <span>{item.label}</span>
            {item.label === "Incidents" && (
              <span className="mobile-badge" aria-label="6 incidents">
                6
              </span>
            )}
          </Link>
        );
      })}
      <button className="mobile-nav-link focus-ring" type="button">
        <MoreHorizontal size={21} aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  );
}

export default function Home() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Sidebar />

      <div className="app-content">
        <header className="mobile-header">
          <Brand />
          <button
            className="icon-button focus-ring"
            type="button"
            aria-label="Notifications, 6 unread"
          >
            <Bell size={21} aria-hidden="true" />
            <span className="notification-dot" />
          </button>
        </header>

        <main id="main-content" className="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">Tuesday, 9 June</p>
              <h1>Good morning, Ali</h1>
              <p className="page-subtitle">
                Review possible incidents and keep every camera healthy.
              </p>
            </div>
            <Link className="primary-button focus-ring" href="#cameras">
              <Plus size={20} aria-hidden="true" />
              Register camera
            </Link>
          </div>

          <section className="attention-banner" aria-labelledby="attention-title">
            <div className="attention-icon" aria-hidden="true">
              <AlertTriangle size={24} />
            </div>
            <div className="attention-copy">
              <p className="eyebrow">Action needed</p>
              <h2 id="attention-title">6 possible incidents need review</h2>
              <p>
                AI suggestions are not final decisions. Check the evidence
                before confirming an incident.
              </p>
            </div>
            <Link className="attention-action focus-ring" href="#incidents">
              Review newest
              <ArrowRight size={19} aria-hidden="true" />
            </Link>
          </section>

          <section aria-labelledby="summary-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Today at a glance</p>
                <h2 id="summary-title">Monitoring summary</h2>
              </div>
              <p className="last-updated" role="status">
                Updated just now
              </p>
            </div>

            <div className="metric-grid">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <article className="metric-card" key={metric.label}>
                    <div className={`metric-icon ${metric.tone}`}>
                      <Icon size={21} aria-hidden="true" />
                    </div>
                    <div>
                      <p>{metric.label}</p>
                      <strong>{metric.value}</strong>
                      <small>{metric.detail}</small>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <div className="dashboard-grid">
            <section
              id="incidents"
              className="panel incidents-panel"
              aria-labelledby="incidents-title"
            >
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Human review queue</p>
                  <h2 id="incidents-title">Recent incidents</h2>
                </div>
                <Link className="text-link focus-ring" href="#incidents">
                  View all
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>

              <div className="incident-list">
                {incidents.map((incident, index) => (
                  <article className="incident-row" key={incident.id}>
                    <div className="evidence-placeholder" aria-hidden="true">
                      <Camera size={22} />
                      <span>{index === 0 ? "Newest" : "Evidence"}</span>
                    </div>
                    <div className="incident-main">
                      <div className="incident-title-row">
                        <h3>{incident.object}</h3>
                        <span
                          className={`status-pill ${
                            incident.status === "Under review"
                              ? "reviewing"
                              : "warning"
                          }`}
                        >
                          {incident.status}
                        </span>
                      </div>
                      <p className="incident-camera">{incident.camera}</p>
                      <div className="incident-meta">
                        <span>
                          <MapPin size={15} aria-hidden="true" />
                          {incident.location}
                        </span>
                        <span>
                          <Clock3 size={15} aria-hidden="true" />
                          {incident.time}
                        </span>
                      </div>
                    </div>
                    <div className="incident-side">
                      <span className="confidence">
                        <small>AI confidence</small>
                        <strong>{incident.confidence}</strong>
                      </span>
                      <Link
                        className="secondary-button focus-ring"
                        href={`#${incident.id}`}
                        aria-label={`Review incident ${incident.id}`}
                      >
                        Review
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section
              id="cameras"
              className="panel camera-panel"
              aria-labelledby="cameras-title"
            >
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Live availability</p>
                  <h2 id="cameras-title">Camera health</h2>
                </div>
                <Link className="text-link focus-ring" href="#cameras">
                  Manage
                </Link>
              </div>

              <div className="health-summary">
                <div className="health-score">
                  <span>92%</span>
                </div>
                <div>
                  <strong>11 of 12 online</strong>
                  <p>One camera needs attention.</p>
                </div>
              </div>

              <ul className="camera-list">
                {cameraHealth.map((camera) => (
                  <li key={camera.name}>
                    <div
                      className={`camera-state ${
                        camera.status === "Online" ? "online" : "offline"
                      }`}
                      aria-hidden="true"
                    >
                      {camera.status === "Online" ? (
                        <Wifi size={18} />
                      ) : (
                        <WifiOff size={18} />
                      )}
                    </div>
                    <div className="camera-copy">
                      <strong>{camera.name}</strong>
                      <span>{camera.location}</span>
                    </div>
                    <div className="camera-seen">
                      <strong
                        className={
                          camera.status === "Online" ? "online" : "offline"
                        }
                      >
                        {camera.status}
                      </strong>
                      <span>{camera.seen}</span>
                    </div>
                  </li>
                ))}
              </ul>

              <Link className="full-width-button focus-ring" href="#cameras">
                Open camera management
              </Link>
            </section>
          </div>
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}
