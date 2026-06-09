"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.client) return;
    setSubmitting(true);
    setError("");
    const redirectTo = `${window.location.origin}/auth/confirm-email`;
    const { error: resetError } = await auth.client.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo },
    );
    setSubmitting(false);
    if (resetError) setError(resetError.message);
    else setSent(true);
  }

  return (
    <main className="auth-single-layout">
      <section className="auth-card compact">
        <Link href="/auth/sign-in" className="back-link focus-ring"><ArrowLeft size={18} /> Back to sign in</Link>
        {sent ? (
          <div className="auth-success"><CheckCircle2 size={34} /><h1>Check your email</h1><p>If an account exists for <strong>{email}</strong>, Supabase has sent a secure password-reset link.</p></div>
        ) : (
          <>
            <div><p className="eyebrow">Account recovery</p><h1>Reset your password</h1><p>Enter your account email and we will send a secure reset link.</p></div>
            <form className="auth-form" onSubmit={submit}>
              <label><span>Email address</span><div className="auth-input"><Mail size={19} /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div></label>
              {error && <div className="auth-error" role="alert"><AlertCircle size={18} />{error}</div>}
              <button className="auth-submit focus-ring" disabled={!auth.configured || submitting}>{submitting ? "Sending..." : "Send reset link"}</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
