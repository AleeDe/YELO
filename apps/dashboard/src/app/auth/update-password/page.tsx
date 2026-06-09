"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";

export default function UpdatePasswordPage() {
  const auth = useAuth();
  const router = useRouter();
  const exchangeStarted = useRef(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [verifyingLink, setVerifyingLink] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  useEffect(() => {
    if (!auth.client || exchangeStarted.current) return;
    exchangeStarted.current = true;

    async function establishRecoverySession() {
      if (!auth.client) return;

      const searchParams = new URLSearchParams(window.location.search);
      const callbackError = searchParams.get("error_description");
      if (callbackError) {
        setError(callbackError.replace(/\+/g, " "));
        window.history.replaceState({}, "", window.location.pathname);
        setVerifyingLink(false);
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } =
          await auth.client.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          setError("This password link is invalid or has expired. Request a new one.");
          setVerifyingLink(false);
          return;
        }

        window.history.replaceState({}, "", window.location.pathname);
      }

      const { data } = await auth.client.auth.getSession();
      setHasRecoverySession(Boolean(data.session));
      if (!data.session) {
        setError("This password link is invalid or has expired. Request a new one.");
      }
      setVerifyingLink(false);
    }

    void establishRecoverySession();
  }, [auth.client]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.client || !hasRecoverySession) return;
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const { error: updateError } = await auth.client.auth.updateUser({ password });
    if (updateError) setError(updateError.message);
    else {
      const { data: sessionData } = await auth.client.auth.getSession();
      const accountEmail = sessionData.session?.user.email;
      if (accountEmail) {
        window.localStorage.setItem("yelo-recovery-email", accountEmail.toLowerCase());
      }
      setSaved(true);
      await auth.client.auth.signOut();
      const signInUrl = accountEmail
        ? `/auth/sign-in?email=${encodeURIComponent(accountEmail)}&passwordUpdated=1`
        : "/auth/sign-in?passwordUpdated=1";
      window.setTimeout(() => router.replace(signInUrl), 1200);
    }
  }

  return (
    <main className="auth-single-layout">
      <section className="auth-card compact">
        <div><p className="eyebrow">Account security</p><h1>Choose a new password</h1><p>Use at least eight characters and avoid reusing an old password.</p></div>
        {verifyingLink ? (
          <div className="auth-success" role="status">
            <LockKeyhole size={34} />
            <h2>Checking secure link</h2>
            <p>Please wait while YELO verifies your request.</p>
          </div>
        ) : saved ? <div className="auth-success"><CheckCircle2 size={34} /><h2>Password updated</h2><p>Returning to sign in...</p></div> : hasRecoverySession ? (
          <form className="auth-form" onSubmit={submit}>
            <label><span>New password</span><div className="auth-input"><LockKeyhole size={19} /><input type={showPassword ? "text" : "password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></label>
            <label><span>Confirm password</span><div className="auth-input"><LockKeyhole size={19} /><input type={showPassword ? "text" : "password"} minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div></label>
            {error && <div className="auth-error" role="alert"><AlertCircle size={18} />{error}</div>}
            <button className="auth-submit focus-ring" disabled={!auth.configured}>Update password</button>
          </form>
        ) : (
          <>
            <div className="auth-error" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <Link className="auth-submit focus-ring" href="/auth/forgot-password">
              Request another secure link
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
