"use client";

import { AlertCircle, CheckCircle2, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export default function UpdatePasswordPage() {
  const auth = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.client) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const { error: updateError } = await auth.client.auth.updateUser({ password });
    if (updateError) setError(updateError.message);
    else {
      setSaved(true);
      window.setTimeout(() => router.replace("/auth/sign-in"), 1200);
    }
  }

  return (
    <main className="auth-single-layout">
      <section className="auth-card compact">
        <div><p className="eyebrow">Account security</p><h1>Choose a new password</h1><p>Use at least eight characters and avoid reusing an old password.</p></div>
        {saved ? <div className="auth-success"><CheckCircle2 size={34} /><h2>Password updated</h2><p>Returning to sign in...</p></div> : (
          <form className="auth-form" onSubmit={submit}>
            <label><span>New password</span><div className="auth-input"><LockKeyhole size={19} /><input type={showPassword ? "text" : "password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div></label>
            <label><span>Confirm password</span><div className="auth-input"><LockKeyhole size={19} /><input type={showPassword ? "text" : "password"} minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div></label>
            {error && <div className="auth-error" role="alert"><AlertCircle size={18} />{error}</div>}
            <button className="auth-submit focus-ring" disabled={!auth.configured}>Update password</button>
          </form>
        )}
      </section>
    </main>
  );
}
