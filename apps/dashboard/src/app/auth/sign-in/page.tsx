"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, Camera, ExternalLink, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { destinationForRole, useAuth } from "@/components/auth-provider";
import { resolveUserAccess } from "@/lib/supabase/access";

const SHIFTDEPLOY_URL = "https://shiftdeploy.com";

export default function SignInPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const recoveryEmail =
        params.get("email") ??
        window.localStorage.getItem("yelo-recovery-email") ??
        "";
      if (recoveryEmail) setEmail(recoveryEmail.toLowerCase());
      setPasswordUpdated(params.get("passwordUpdated") === "1");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.client) return;
    setSubmitting(true);
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    const { data, error: signInError } = await auth.client.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError || !data.user) {
      if (signInError?.message.toLowerCase().includes("invalid login credentials")) {
        setError(
          `Supabase rejected the email/password pair for ${normalizedEmail}. Make sure this is the same email shown in the password-reset confirmation, then request one new reset if needed.`,
        );
      } else if (signInError?.message.toLowerCase().includes("email not confirmed")) {
        setError("This account email has not been confirmed yet. Open the newest invitation email first.");
      } else {
        setError(signInError?.message ?? "Unable to sign in.");
      }
      setSubmitting(false);
      return;
    }

    window.localStorage.removeItem("yelo-recovery-email");
    const access = await resolveUserAccess(auth.client, data.user);
    await auth.refreshRole();
    router.replace(destinationForRole(access.role));
  }

  return (
    <main className="auth-layout">
      <header className="auth-mobile-brand">
        <span aria-hidden="true">Y</span>
        <div><strong>YELO</strong><small>Clean spaces, clearly managed</small></div>
      </header>
      <section className="auth-brand-panel">
        <Link href="/" className="auth-brand"><span>Y</span><strong>YELO</strong></Link>
        <div>
          <p className="eyebrow">AI-assisted monitoring</p>
          <h1>Cleaner spaces start with timely review.</h1>
          <p>Monitor cameras, review possible littering incidents, and coordinate society response from one workspace.</p>
        </div>
        <div className="auth-brand-footer">
          <ul>
            <li><ShieldCheck size={19} /> Society data remains isolated by role.</li>
            <li><ShieldCheck size={19} /> AI suggestions always require human review.</li>
            <li><ShieldCheck size={19} /> Continuous raw video is not stored by default.</li>
          </ul>
          <a className="auth-powered focus-ring" href={SHIFTDEPLOY_URL} target="_blank" rel="noopener noreferrer">
            Powered by <strong>ShiftDeploy</strong> <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
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

          {passwordUpdated && (
            <div className="auth-notice" role="status">
              <ShieldCheck size={20} />
              <div><strong>Password updated</strong><p>Sign in with the email shown below and your new password.</p></div>
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
          <Link className="auth-camera-mode focus-ring" href="/capture">
            <Camera size={19} />
            <span><strong>Use this device as a camera</strong><small>Pair with a one-time camera token</small></span>
            <ArrowRight size={18} />
          </Link>
          <div className="auth-card-footer">
            <Link href="/legal" className="focus-ring">Privacy &amp; Terms</Link>
            <span aria-hidden="true">·</span>
            <a href={SHIFTDEPLOY_URL} target="_blank" rel="noopener noreferrer" className="focus-ring">Powered by ShiftDeploy</a>
          </div>
        </div>
      </section>
    </main>
  );
}
