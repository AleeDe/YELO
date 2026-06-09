"use client";

import {
  AlertCircle,
  Building2,
  CheckCircle2,
  LoaderCircle,
  MailPlus,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader, StatusPill } from "@/components/ui";

type SocietyRow = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  timezone: string;
  is_active: boolean;
  created_at: string;
  cameras: { count: number }[];
  society_members: { count: number }[];
};

type SocietyForm = {
  name: string;
  slug: string;
  address: string;
  timezone: string;
};

type InvitationForm = {
  email: string;
  fullName: string;
};

const emptyForm: SocietyForm = {
  name: "",
  slug: "",
  address: "",
  timezone: "Asia/Karachi",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function countRelation(relation: { count: number }[] | undefined) {
  return relation?.[0]?.count ?? 0;
}

export default function SocietiesPage() {
  const auth = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const invitationDialogRef = useRef<HTMLDialogElement>(null);
  const [societies, setSocieties] = useState<SocietyRow[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<SocietyForm>(emptyForm);
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [invitationSociety, setInvitationSociety] = useState<SocietyRow | null>(null);
  const [invitation, setInvitation] = useState<InvitationForm>({
    email: "",
    fullName: "",
  });
  const [invitationError, setInvitationError] = useState("");
  const [inviting, setInviting] = useState(false);

  const loadSocieties = useCallback(async () => {
    if (!auth.client || !auth.user) return;
    setLoading(true);
    setLoadError("");

    const { data, error } = await auth.client
      .from("societies")
      .select(
        "id, name, slug, address, timezone, is_active, created_at, cameras(count), society_members(count)",
      )
      .order("created_at", { ascending: false });

    if (error) {
      setLoadError(error.message);
    } else {
      setSocieties((data ?? []) as SocietyRow[]);
    }
    setLoading(false);
  }, [auth.client, auth.user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadSocieties(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadSocieties]);

  const filteredSocieties = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return societies;
    return societies.filter((society) =>
      [society.name, society.slug, society.address ?? ""].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [query, societies]);

  function openDialog() {
    setForm(emptyForm);
    setSlugEdited(false);
    setFormError("");
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (submitting) return;
    dialogRef.current?.close();
  }

  function updateName(name: string) {
    setForm((current) => ({
      ...current,
      name,
      slug: slugEdited ? current.slug : slugify(name),
    }));
  }

  function openInvitationDialog(society: SocietyRow) {
    setInvitationSociety(society);
    setInvitation({ email: "", fullName: "" });
    setInvitationError("");
    invitationDialogRef.current?.showModal();
  }

  function closeInvitationDialog() {
    if (inviting) return;
    invitationDialogRef.current?.close();
  }

  async function inviteAdministrator(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.client || !invitationSociety) return;
    setInviting(true);
    setInvitationError("");

    const { error } = await auth.client.functions.invoke("invite-society-member", {
      body: {
        societyId: invitationSociety.id,
        email: invitation.email.trim(),
        fullName: invitation.fullName.trim(),
        role: "society_admin",
        redirectTo: `${window.location.origin}/auth/confirm-email`,
      },
    });

    setInviting(false);
    if (error) {
      let message = error.message;
      if ("context" in error && error.context instanceof Response) {
        const response = await error.context.json().catch(() => null);
        message = response?.error ?? message;
      }
      setInvitationError(message);
      return;
    }

    const societyName = invitationSociety.name;
    invitationDialogRef.current?.close();
    setSuccessMessage(`Administrator invitation sent for ${societyName}.`);
    await loadSocieties();
    window.setTimeout(() => setSuccessMessage(""), 5000);
  }

  async function createSociety(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.client || !auth.user) return;

    const name = form.name.trim();
    const slug = slugify(form.slug);
    if (name.length < 2) {
      setFormError("Society name must contain at least two characters.");
      return;
    }
    if (!slug) {
      setFormError("Enter a valid URL identifier.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    const { data, error } = await auth.client
      .from("societies")
      .insert({
        name,
        slug,
        address: form.address.trim() || null,
        timezone: form.timezone,
        created_by: auth.user.id,
      })
      .select(
        "id, name, slug, address, timezone, is_active, created_at, cameras(count), society_members(count)",
      )
      .single();

    setSubmitting(false);
    if (error) {
      setFormError(
        error.code === "23505"
          ? "That URL identifier is already used by another society."
          : error.message,
      );
      return;
    }

    setSocieties((current) => [data as SocietyRow, ...current]);
    setSuccessMessage(`${name} was created successfully.`);
    dialogRef.current?.close();
    window.setTimeout(() => setSuccessMessage(""), 5000);
  }

  return (
    <>
      <PageHeader
        eyebrow="Platform tenants"
        title="Societies"
        description="Create society workspaces, assign administrators, and monitor onboarding."
        action={
          <button className="primary-button focus-ring" type="button" onClick={openDialog}>
            <Plus size={20} /> Add society
          </button>
        }
      />

      {successMessage && (
        <div className="page-feedback success" role="status">
          <CheckCircle2 size={19} />
          <span>{successMessage}</span>
        </div>
      )}

      <section className="panel page-panel" aria-busy={loading}>
        <div className="toolbar">
          <label className="search-field">
            <Search size={19} />
            <span className="sr-only">Search societies</span>
            <input
              type="search"
              placeholder="Search society, slug, or address"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {!loading && (
            <p className="toolbar-count" aria-live="polite">
              {filteredSocieties.length} {filteredSocieties.length === 1 ? "society" : "societies"}
            </p>
          )}
        </div>

        {loading ? (
          <div className="directory-state" role="status">
            <LoaderCircle className="spin" size={24} />
            <p>Loading societies...</p>
          </div>
        ) : loadError ? (
          <div className="directory-state error" role="alert">
            <AlertCircle size={24} />
            <h2>Societies could not be loaded</h2>
            <p>{loadError}</p>
            <button className="secondary-button focus-ring" type="button" onClick={() => void loadSocieties()}>
              Try again
            </button>
          </div>
        ) : filteredSocieties.length === 0 ? (
          <div className="directory-state">
            <Building2 size={28} />
            <h2>{query ? "No matching societies" : "Create your first society"}</h2>
            <p>
              {query
                ? "Try a different name, slug, or address."
                : "Each society gets an isolated workspace for its members, cameras, and incidents."}
            </p>
            {!query && (
              <button className="secondary-button focus-ring" type="button" onClick={openDialog}>
                <Plus size={18} /> Add society
              </button>
            )}
          </div>
        ) : (
          <div className="society-directory">
            {filteredSocieties.map((society) => (
              <article key={society.id}>
                <span className="directory-icon" aria-hidden="true">
                  <Building2 size={22} />
                </span>
                <div className="directory-name">
                  <h2>{society.name}</h2>
                  <p>{society.slug}</p>
                </div>
                <div>
                  <small>Location</small>
                  <strong>{society.address || "Not provided"}</strong>
                </div>
                <div>
                  <small>Cameras</small>
                  <strong>{countRelation(society.cameras)}</strong>
                </div>
                <div>
                  <small>Members</small>
                  <strong>{countRelation(society.society_members)}</strong>
                </div>
                <StatusPill status={society.is_active ? "Active" : "Needs review"} />
                <button
                  className="table-action invite-admin-action focus-ring"
                  type="button"
                  onClick={() => openInvitationDialog(society)}
                >
                  <MailPlus size={16} /> Invite admin
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <dialog
        ref={dialogRef}
        className="form-dialog"
        onCancel={(event) => {
          if (submitting) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeDialog();
        }}
      >
        <form className="dialog-card" onSubmit={createSociety}>
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">New tenant workspace</p>
              <h2>Create society</h2>
              <p>Add the minimum details now. You can assign its administrator next.</p>
            </div>
            <button
              className="icon-button focus-ring"
              type="button"
              aria-label="Close create society dialog"
              onClick={closeDialog}
              disabled={submitting}
            >
              <X size={20} />
            </button>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Society name</span>
              <input
                autoFocus
                required
                minLength={2}
                maxLength={120}
                value={form.name}
                onChange={(event) => updateName(event.target.value)}
                placeholder="Green Residency"
              />
            </label>
            <label className="form-field">
              <span>URL identifier</span>
              <input
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                value={form.slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  setForm((current) => ({ ...current, slug: slugify(event.target.value) }));
                }}
                placeholder="green-residency"
              />
              <small>Lowercase letters, numbers, and hyphens only.</small>
            </label>
            <label className="form-field full-field">
              <span>Address</span>
              <input
                value={form.address}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: event.target.value }))
                }
                placeholder="Main Boulevard, Lahore"
              />
            </label>
            <label className="form-field full-field">
              <span>Timezone</span>
              <select
                value={form.timezone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, timezone: event.target.value }))
                }
              >
                <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                <option value="UTC">UTC</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              </select>
            </label>
          </div>

          {formError && (
            <div className="auth-error" role="alert">
              <AlertCircle size={18} />
              <span>{formError}</span>
            </div>
          )}

          <div className="dialog-actions">
            <button className="secondary-button focus-ring" type="button" onClick={closeDialog} disabled={submitting}>
              Cancel
            </button>
            <button className="primary-button focus-ring" type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}
              {submitting ? "Creating..." : "Create society"}
            </button>
          </div>
        </form>
      </dialog>

      <dialog
        ref={invitationDialogRef}
        className="form-dialog"
        onCancel={(event) => {
          if (inviting) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === invitationDialogRef.current) closeInvitationDialog();
        }}
      >
        <form className="dialog-card" onSubmit={inviteAdministrator}>
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">Society access</p>
              <h2>Invite administrator</h2>
              <p>
                Give one person administrator access to{" "}
                <strong>{invitationSociety?.name}</strong>.
              </p>
            </div>
            <button
              className="icon-button focus-ring"
              type="button"
              aria-label="Close administrator invitation"
              onClick={closeInvitationDialog}
              disabled={inviting}
            >
              <X size={20} />
            </button>
          </div>

          <div className="invitation-guidance">
            <MailPlus size={21} />
            <div>
              <strong>Supabase sends a secure invitation email</strong>
              <p>The recipient chooses their password before entering the society workspace.</p>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Full name</span>
              <input
                autoFocus
                required
                minLength={2}
                maxLength={120}
                value={invitation.fullName}
                onChange={(event) =>
                  setInvitation((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                placeholder="Administrator name"
              />
            </label>
            <label className="form-field">
              <span>Email address</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={invitation.email}
                onChange={(event) =>
                  setInvitation((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="admin@example.com"
              />
            </label>
          </div>

          {invitationError && (
            <div className="auth-error" role="alert">
              <AlertCircle size={18} />
              <span>{invitationError}</span>
            </div>
          )}

          <div className="dialog-actions">
            <button
              className="secondary-button focus-ring"
              type="button"
              onClick={closeInvitationDialog}
              disabled={inviting}
            >
              Cancel
            </button>
            <button className="primary-button focus-ring" type="submit" disabled={inviting}>
              {inviting ? <LoaderCircle className="spin" size={18} /> : <MailPlus size={18} />}
              {inviting ? "Sending invitation..." : "Send invitation"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
