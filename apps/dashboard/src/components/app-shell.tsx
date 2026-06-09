"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  Check,
  ChevronDown,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  Video,
} from "lucide-react";

type Role = "society_admin" | "super_admin" | "operator";

const roleConfig = {
  society_admin: {
    label: "Society administrator",
    home: "/",
    navigation: [
      { label: "Overview", icon: LayoutDashboard, href: "/" },
      { label: "Incidents", icon: AlertTriangle, href: "/incidents" },
      { label: "Cameras", icon: Video, href: "/cameras" },
      { label: "Analytics", icon: BarChart3, href: "/analytics" },
      { label: "Members", icon: Users, href: "/members" },
      { label: "Settings", icon: Settings, href: "/settings" },
    ],
  },
  super_admin: {
    label: "Super administrator",
    home: "/super-admin",
    navigation: [
      { label: "Command center", icon: LayoutDashboard, href: "/super-admin" },
      { label: "Societies", icon: Building2, href: "/super-admin/societies" },
      { label: "Cameras", icon: Video, href: "/cameras" },
      { label: "Incidents", icon: AlertTriangle, href: "/incidents" },
      { label: "Platform settings", icon: Settings, href: "/super-admin/settings" },
    ],
  },
  operator: {
    label: "Operator",
    home: "/operator",
    navigation: [
      { label: "My queue", icon: ClipboardCheck, href: "/operator" },
      { label: "Incidents", icon: AlertTriangle, href: "/incidents" },
      { label: "Cameras", icon: Video, href: "/cameras" },
    ],
  },
} as const;

type SocietyOption = {
  id: string;
  name: string;
  initials: string;
  cameras: number;
};

const previewSocieties: SocietyOption[] = [
  { id: "preview-green", name: "Green Residency", initials: "GR", cameras: 12 },
  { id: "preview-lake", name: "Lake View Society", initials: "LV", cameras: 8 },
  { id: "preview-model", name: "Model Town Homes", initials: "MT", cameras: 5 },
];

function Brand({ home }: { home: string }) {
  return (
    <Link href={home} className="brand focus-ring" aria-label="YELO overview">
      <span className="brand-mark" aria-hidden="true">Y</span>
      <span><strong>YELO</strong><small>Clean spaces, clearly managed</small></span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const [role, setRole] = useState<Role>(() =>
    pathname.startsWith("/super-admin") ? "super_admin" : pathname.startsWith("/operator") ? "operator" : "society_admin",
  );
  const [societies, setSocieties] = useState<SocietyOption[]>(
    auth.configured ? [] : previewSocieties,
  );
  const [selectedSocietyId, setSelectedSocietyId] = useState<string | null>(null);
  const [societyOpen, setSocietyOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const societyRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);
  const effectiveRole = auth.role ?? role;
  const config = roleConfig[effectiveRole];
  const userName =
    auth.user?.user_metadata.full_name ||
    auth.user?.email?.split("@")[0] ||
    "YELO user";
  const userEmail = auth.user?.email ?? "";
  const society = useMemo(
    () =>
      societies.find((item) => item.id === selectedSocietyId) ??
      societies[0] ??
      null,
    [selectedSocietyId, societies],
  );
  const userInitials = userName
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    window.localStorage.setItem("yelo-demo-role", role);
  }, [role]);

  useEffect(() => {
    if (!auth.configured || !auth.client || !auth.user) return;

    const timeout = window.setTimeout(async () => {
      const { data } = await auth.client!
        .from("societies")
        .select("id, name, cameras(count)")
        .order("name");

      const options = (data ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        initials: item.name
          .split(" ")
          .map((word: string) => word[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        cameras: (item.cameras as { count: number }[] | undefined)?.[0]?.count ?? 0,
      }));
      setSocieties(options);
      setSelectedSocietyId((current) =>
        options.some((item) => item.id === current)
          ? current
          : auth.societyId ?? options[0]?.id ?? null,
      );
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [auth.client, auth.configured, auth.societyId, auth.user]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    if (mobileMenuOpen) {
      window.requestAnimationFrame(() => mobileCloseButtonRef.current?.focus());
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      const target = event.target as Node;
      if (!societyRef.current?.contains(target)) setSocietyOpen(false);
      if (!userRef.current?.contains(target)) setUserOpen(false);
    }
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSocietyOpen(false);
        setUserOpen(false);
        setMobileMenuOpen(false);
        window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
      }
    }
    document.addEventListener("mousedown", closeMenus);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenus);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  function changeRole(nextRole: Role) {
    if (auth.configured) return;
    setRole(nextRole);
    setUserOpen(false);
    setMobileMenuOpen(false);
    router.push(roleConfig[nextRole].home);
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
    window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
  }

  if (pathname.startsWith("/auth")) return <>{children}</>;
  if (auth.configured && (auth.loading || !auth.user)) {
    return (
      <main className="auth-loading" role="status" aria-live="polite">
        <span className="loading-mark">Y</span>
        <strong>Checking your secure session...</strong>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="sidebar" aria-label="Primary navigation">
        <Brand home={config.home} />
        <div className="society-switcher" ref={societyRef}>
          <span className="eyebrow">{effectiveRole === "super_admin" ? "Administration scope" : "Current society"}</span>
          {effectiveRole === "super_admin" ? (
            <Link className="platform-scope-card focus-ring" href="/super-admin/societies">
              <span className="platform-scope-icon" aria-hidden="true"><Building2 size={20} /></span>
              <span><strong>Entire platform</strong><small>{societies.length} societies · {societies.reduce((total, item) => total + item.cameras, 0)} cameras</small></span>
              <ChevronDown className="scope-arrow" size={18} aria-hidden="true" />
            </Link>
          ) : (
          <>
          <button
            className="society-button focus-ring"
            type="button"
            aria-expanded={societyOpen}
            aria-haspopup="menu"
            onClick={() => setSocietyOpen((open) => !open)}
          >
            <span className="society-avatar" aria-hidden="true">{society?.initials ?? "--"}</span>
            <span className="society-copy"><strong>{society?.name ?? "No society yet"}</strong><small>{config.label}</small></span>
            <ChevronDown className={societyOpen ? "rotate-icon" : ""} size={18} aria-hidden="true" />
          </button>
          {societyOpen && (
            <div className="popover-menu society-menu" role="menu" aria-label="Choose society">
              <div className="popover-heading"><strong>Switch society</strong><small>Changes dashboard context</small></div>
              {societies.map((item) => (
                <button
                  key={item.name}
                  role="menuitemradio"
                  aria-checked={society?.id === item.id}
                  onClick={() => { setSelectedSocietyId(item.id); setSocietyOpen(false); }}
                >
                  <span className="menu-avatar">{item.initials}</span>
                  <span><strong>{item.name}</strong><small>{item.cameras} registered cameras</small></span>
                  {society?.id === item.id && <Check size={17} aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}
          </>
          )}
        </div>

        <nav className="desktop-nav">
          <span className="eyebrow nav-label">{effectiveRole === "super_admin" ? "Platform" : "Workspace"}</span>
          <ul>
            {config.navigation.map((item) => {
              const Icon = item.icon;
              const current = isCurrent(item.href);
              return (
                <li key={item.label}>
                  <Link href={item.href} className={`nav-link focus-ring ${current ? "active" : ""}`} aria-current={current ? "page" : undefined}>
                    <Icon size={20} strokeWidth={1.9} aria-hidden="true" /><span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-status">
          <div className="status-icon success" aria-hidden="true"><ShieldCheck size={20} /></div>
          <div><strong>Detection service ready</strong><p>{societies.reduce((total, item) => total + item.cameras, 0)} registered cameras</p></div>
        </div>

        <div className="user-menu-wrap" ref={userRef}>
          <button className="user-menu focus-ring" type="button" aria-expanded={userOpen} aria-haspopup="menu" onClick={() => setUserOpen((open) => !open)}>
            <span className="user-avatar" aria-hidden="true">{userInitials}</span>
            <span><strong>{userName}</strong><small>{config.label}</small></span>
            <MoreHorizontal size={20} aria-hidden="true" />
          </button>
          {userOpen && (
            <div className="popover-menu user-popover" role="menu" aria-label="Account and role menu">
              <div className="popover-profile"><span className="user-avatar">{userInitials}</span><span><strong>{userName}</strong><small>{userEmail}</small></span></div>
              {!auth.configured && <>
                <div className="menu-separator" />
                <span className="menu-label">Preview dashboard as</span>
                {(Object.keys(roleConfig) as Role[]).map((item) => (
                  <button key={item} role="menuitemradio" aria-checked={role === item} onClick={() => changeRole(item)}>
                    <UserCog size={18} /><span><strong>{roleConfig[item].label}</strong><small>{item === "super_admin" ? "Manage the complete platform" : item === "operator" ? "Review assigned incidents" : "Manage one society"}</small></span>
                    {role === item && <Check size={17} />}
                  </button>
                ))}
              </>}
              <div className="menu-separator" />
              <Link href="/account" className="popover-link" onClick={() => setUserOpen(false)}><Settings size={17} /> Account settings</Link>
              <button className="logout-item" role="menuitem" onClick={() => void auth.signOut()}><LogOut size={17} /> Sign out</button>
            </div>
          )}
        </div>
      </aside>

      <div className="app-content">
        <header className="mobile-header">
          <Brand home={config.home} />
          <div className="mobile-header-actions">
            <button className="icon-button focus-ring" type="button" aria-label="Notifications"><Bell size={21} /></button>
            <button ref={mobileMenuButtonRef} className="icon-button focus-ring" type="button" aria-label="Open navigation and account menu" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)}><Menu size={22} /></button>
          </div>
        </header>
        <main id="main-content" className="main-content">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile primary navigation">
        {config.navigation.slice(0, 3).map((item) => {
          const Icon = item.icon;
          const current = isCurrent(item.href);
          return <Link key={item.label} href={item.href} className={`mobile-nav-link focus-ring ${current ? "active" : ""}`} aria-current={current ? "page" : undefined}><Icon size={21} /><span>{item.label}</span></Link>;
        })}
        <button className={`mobile-nav-link focus-ring ${mobileMenuOpen ? "active" : ""}`} type="button" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)}><MoreHorizontal size={21} /><span>More</span></button>
      </nav>

      {mobileMenuOpen && (
        <div className="mobile-sheet-layer" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeMobileMenu(); }}>
          <section className="mobile-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title">
            <div className="mobile-sheet-heading">
              <div><p className="eyebrow">Navigation</p><h2 id="mobile-menu-title">Menu and account</h2></div>
              <button ref={mobileCloseButtonRef} className="icon-button focus-ring" type="button" aria-label="Close menu" onClick={closeMobileMenu}><span aria-hidden="true">×</span></button>
            </div>
            <div className="mobile-context-card">
              <span className="society-avatar" aria-hidden="true">{effectiveRole === "super_admin" ? <Building2 size={18} /> : society?.initials ?? "--"}</span>
              <div><strong>{effectiveRole === "super_admin" ? "Entire platform" : society?.name ?? "No society yet"}</strong><small>{config.label}</small></div>
            </div>
            <div className="mobile-sheet-section">
              <p className="menu-label">Go to</p>
              <nav className="mobile-all-nav" aria-label="All role navigation">
                {config.navigation.map((item) => {
                  const Icon = item.icon;
                  return <Link key={item.label} href={item.href} className={`mobile-sheet-link focus-ring ${isCurrent(item.href) ? "active" : ""}`} onClick={() => setMobileMenuOpen(false)}><Icon size={20} /><span>{item.label}</span></Link>;
                })}
              </nav>
            </div>
            {effectiveRole !== "super_admin" && <div className="mobile-sheet-section">
              <p className="menu-label">Switch society</p>
              <div className="mobile-choice-list">
                {societies.map((item) => <button key={item.id} className="mobile-choice focus-ring" onClick={() => setSelectedSocietyId(item.id)}><span className="menu-avatar">{item.initials}</span><span><strong>{item.name}</strong><small>{item.cameras} cameras</small></span>{society?.id === item.id && <Check size={18} />}</button>)}
              </div>
            </div>}
            <div className="mobile-sheet-section">
              {!auth.configured && <>
                <p className="menu-label">Preview role</p>
                <div className="mobile-choice-list">
                  {(Object.keys(roleConfig) as Role[]).map((item) => <button key={item} className="mobile-choice focus-ring" onClick={() => changeRole(item)}><UserCog size={19} /><span><strong>{roleConfig[item].label}</strong><small>{item === "operator" ? "Review incidents" : item === "super_admin" ? "Manage platform" : "Manage society"}</small></span>{role === item && <Check size={18} />}</button>)}
                </div>
              </>}
            </div>
            <button className="mobile-signout focus-ring" type="button" onClick={() => void auth.signOut()}><LogOut size={18} /> Sign out</button>
          </section>
        </div>
      )}
    </div>
  );
}
