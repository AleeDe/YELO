"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { EmptyState, MetricCard, PageHeader, StatusPill } from "@/components/ui";

type EventRow = {
  id: string;
  object_class: string;
  confidence: number;
  status: string;
  detected_at: string;
  cameras: { name: string; location_label: string }[];
  restricted_zones: { name: string }[];
};

const statusLabels: Record<string, string> = {
  new: "Needs review",
  under_review: "Under review",
  confirmed: "Confirmed",
  false_positive: "False alert",
  resolved: "Resolved",
};

export default function IncidentsPage() {
  const auth = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.client || !auth.user) return;
    const timeout = window.setTimeout(async () => {
      const { data, error: loadError } = await auth.client!
        .from("detection_events")
        .select("id, object_class, confidence, status, detected_at, cameras(name, location_label), restricted_zones(name)")
        .order("detected_at", { ascending: false });
      setEvents((data ?? []) as EventRow[]);
      setError(loadError?.message ?? "");
      setLoading(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [auth.client, auth.user]);

  useEffect(() => {
    if (!auth.client || !auth.user) return;
    const channel = auth.client
      .channel(`incident-list-${auth.user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "detection_events" },
        (payload) => {
          const event = payload.new as Pick<EventRow, "id">;
          void auth.client!
            .from("detection_events")
            .select("id, object_class, confidence, status, detected_at, cameras(name, location_label), restricted_zones(name)")
            .eq("id", event.id)
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                setEvents((current) => [
                  data as EventRow,
                  ...current.filter((item) => item.id !== data.id),
                ]);
              }
            });
        },
      )
      .subscribe();
    return () => {
      void auth.client?.removeChannel(channel);
    };
  }, [auth.client, auth.user]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value
      ? events.filter((event) =>
          `${event.id} ${event.object_class} ${event.cameras?.[0]?.name ?? ""}`.toLowerCase().includes(value),
        )
      : events;
  }, [events, query]);

  const needsReview = events.filter((event) => event.status === "new").length;
  const underReview = events.filter((event) => event.status === "under_review").length;
  const resolved = events.filter((event) => ["confirmed", "false_positive", "resolved"].includes(event.status)).length;

  return (
    <>
      <PageHeader eyebrow="Human review" title="Incidents" description="Review AI-flagged events, record decisions, and track resolution." />
      <div className="metric-grid compact-metrics">
        <MetricCard label="Needs review" value={String(needsReview)} detail="Awaiting human decision" tone="warning" icon={AlertTriangle} />
        <MetricCard label="Under review" value={String(underReview)} detail="Review in progress" tone="neutral" icon={Clock3} />
        <MetricCard label="Completed" value={String(resolved)} detail="Reviewed incidents" tone="success" icon={CheckCircle2} />
      </div>
      <section className="panel page-panel" aria-busy={loading}>
        <div className="toolbar"><label className="search-field"><Search size={19} /><span className="sr-only">Search incidents</span><input type="search" placeholder="Search by ID, camera, or object" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
        {loading ? (
          <div className="directory-state" role="status"><LoaderCircle className="spin" size={24} /><p>Loading incidents...</p></div>
        ) : error ? (
          <div className="directory-state error" role="alert"><p>{error}</p></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={AlertTriangle} title={query ? "No matching incidents" : "No incidents detected"} description={query ? "Try another incident ID, camera, or object." : "AI-generated littering events will appear here when a connected camera reports them."} actionLabel="View cameras" href="/cameras" />
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Incident</th><th>Source</th><th>Detected</th><th>Confidence</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead>
              <tbody>{filtered.map((event) => <tr key={event.id}>
                <td data-label="Incident"><strong>{event.object_class}</strong><small>{event.id.slice(0, 8)} · {event.restricted_zones?.[0]?.name ?? "No zone"}</small></td>
                <td data-label="Source"><strong>{event.cameras?.[0]?.name ?? "Unknown camera"}</strong><small>{event.cameras?.[0]?.location_label ?? "Location unavailable"}</small></td>
                <td data-label="Detected"><span>{new Date(event.detected_at).toLocaleString()}</span></td>
                <td data-label="Confidence"><span className="confidence-value">{Math.round(Number(event.confidence) * 100)}%</span></td>
                <td data-label="Status"><StatusPill status={statusLabels[event.status] ?? event.status} /></td>
                <td data-label="Action"><Link className="table-action focus-ring" href={`/incidents/view?id=${event.id}`}>Review evidence</Link></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
