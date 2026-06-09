"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { destinationForRole, useAuth } from "@/components/auth-provider";
import { resolveUserAccess } from "@/lib/supabase/access";

export default function SignInPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.client) return;
    setSubmitting(true);
    setError("");

    const { data, error: signInError } = await auth.client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      setError(signInError?.message ?? "Unable to sign in.");
      setSubmitting(false);
      return;
    }

    const access = await resolveUserAccess(auth.client, data.user);
    await auth.refreshRole();
    router.replace(destinationForRole(access.role));
  }

  return (
    <main className="auth-layout">
      <section className="auth-brand-panel">
        <Link href="/" className="auth-brand"><span>Y</span><strong>YELO</strong></Link>
        <div>
          <p className="eyebrow">AI-assisted monitoring</p>
          <h1>Cleaner spaces start with timely review.</h1>
          <p>Monitor cameras, review possible littering incidents, and coordinate society response from one workspace.</p>
        </div>
        <ul>
          <li><ShieldCheck size={19} /> Society data remains isolated by role.</li>
          <li><ShieldCheck size={19} /> AI suggestions always require human review.</li>
          <li><ShieldCheck size={19} /> Continuous raw video is not stored by default.</li>
        </ul>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          <div><p className="eyebrow">Welcome back</p><h2>Sign in to YELO</h2><p>Use the account assigned by your platform or society administrator.</p></div>

          {!auth.configured && (
            <div className="auth-notice warning" role="alert">
              <AlertCircle size={20} />
              <div><strong>Supabase setup required</strong><p>Add the project URL and public anon key to <code>.env.local</code>. Dashboard preview remains available until then.</p></div>
            </div>
          )}

          <form className="auth-form" onSubmit={submit}>
            <label><span>Email address</span><div className="auth-input"><Mail size={19} /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div></label>
            <label><span>Password</span><div className="auth-input"><LockKeyhole size={19} /><input type={showPassword ? "text" : "password"} autoComplete="current-password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></label>
            <div className="auth-form-row"><label className="remember-choice"><input type="checkbox" /> <span>Remember this device</span></label><Link href="/auth/forgot-password">Forgot password?</Link></div>
            {error && <div className="auth-error" role="alert"><AlertCircle size={18} />{error}</div>}
            <button className="auth-submit focus-ring" type="submit" disabled={!auth.configured || submitting}>{submitting ? "Signing in..." : "Sign in"}<ArrowRight size={19} /></button>
          </form>
          <p className="auth-help">Need access? Contact your society administrator.</p>
        </div>
      </section>
    </main>
  );
}

