"use client";

import Link from "next/link";
import { KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/ui";

export default function AccountPage() {
  const auth = useAuth();
  const name = auth.user?.user_metadata.full_name || auth.user?.email?.split("@")[0] || "YELO user";
  return <>
    <PageHeader eyebrow="Personal account" title="Account settings" description="Manage your own identity and sign-in security. These settings do not change any society or platform policy." />
    <div className="account-grid">
      <section className="panel settings-section">
        <div className="settings-heading"><p className="eyebrow">Profile</p><h2>Your identity</h2><p>Shown to other administrators in review and audit activity.</p></div>
        <div className="account-summary"><span className="account-summary-icon"><UserRound size={24} /></span><div><strong>{name}</strong><span>{auth.user?.email}</span></div></div>
        <div className="form-grid">
          <label className="form-field"><span>Display name</span><input value={name} readOnly /></label>
          <label className="form-field"><span>Email address</span><input value={auth.user?.email ?? ""} readOnly /></label>
        </div>
      </section>
      <aside className="account-side">
        <section className="panel account-action-card"><Mail size={21} /><div><strong>Email verified</strong><p>Your Supabase sign-in email is active.</p></div><ShieldCheck size={19} /></section>
        <section className="panel account-action-card"><KeyRound size={21} /><div><strong>Password security</strong><p>Use password recovery to rotate your password securely.</p></div><Link href="/auth/forgot-password" className="table-action focus-ring">Reset</Link></section>
      </aside>
    </div>
  </>;
}
