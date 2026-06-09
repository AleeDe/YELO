"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronDown,
  LayoutDashboard,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, href: "/" },
  { label: "Incidents", icon: AlertTriangle, href: "/incidents" },
  { label: "Cameras", icon: Video, href: "/cameras" },
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
  { label: "Members", icon: Users, href: "/members" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

function Brand() {
  return (
    <Link href="/" className="brand focus-ring" aria-label="YELO overview">
      <span className="brand-mark" aria-hidden="true">Y</span>
      <span>
        <strong>YELO</strong>
        <small>Clean spaces, clearly managed</small>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="sidebar" aria-label="Primary navigation">
        <Brand />
        <div className="society-switcher">
          <span className="eyebrow">Current society</span>
          <button className="society-button focus-ring" type="button">
            <span className="society-avatar" aria-hidden="true">GR</span>
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
              const current = isCurrent(item.href);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`nav-link focus-ring ${current ? "active" : ""}`}
                    aria-current={current ? "page" : undefined}
                  >
                    <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.label === "Incidents" && (
                      <span className="nav-count" aria-label="6 incidents">6</span>
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
          <span className="user-avatar" aria-hidden="true">AH</span>
          <span>
            <strong>Ali Hassan</strong>
            <small>ali@example.com</small>
          </span>
          <MoreHorizontal size={20} aria-hidden="true" />
        </button>
      </aside>

      <div className="app-content">
        <header className="mobile-header">
          <Brand />
          <button className="icon-button focus-ring" type="button" aria-label="Notifications, 6 unread">
            <Bell size={21} aria-hidden="true" />
            <span className="notification-dot" />
          </button>
        </header>
        <main id="main-content" className="main-content">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile primary navigation">
        {navigation.slice(0, 3).map((item) => {
          const Icon = item.icon;
          const current = isCurrent(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`mobile-nav-link focus-ring ${current ? "active" : ""}`}
              aria-current={current ? "page" : undefined}
            >
              <Icon size={21} aria-hidden="true" />
              <span>{item.label}</span>
              {item.label === "Incidents" && (
                <span className="mobile-badge" aria-label="6 incidents">6</span>
              )}
            </Link>
          );
        })}
        <Link href="/settings" className={`mobile-nav-link focus-ring ${pathname === "/settings" ? "active" : ""}`}>
          <MoreHorizontal size={21} aria-hidden="true" />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}

