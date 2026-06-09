import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-subtitle">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "warning" | "success" | "neutral";
  icon: LucideIcon;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}><Icon size={21} aria-hidden="true" /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "Online" || status === "Confirmed" || status === "Active"
      ? "success"
      : status === "Offline" || status === "False alert"
        ? "danger"
        : status === "Under review"
          ? "reviewing"
          : "warning";
  return <span className={`status-pill ${tone}`}>{status}</span>;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  href,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={26} aria-hidden="true" /></div>
      <h2>{title}</h2>
      <p>{description}</p>
      <Link href={href} className="secondary-button focus-ring">{actionLabel}</Link>
    </div>
  );
}

