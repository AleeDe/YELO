"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, LoaderCircle, MailCheck, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

type ConfirmationType = "recovery" | "invite";

export default function ConfirmEmailPage() {
  const auth = useAuth();
  const router = useRouter();
  const [tokenHash, setTokenHash] = useState("");
  const [confirmationType, setConfirmationType] = useState<ConfirmationType | null>(null);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const callbackError = params.get("error_description");
      const hash = params.get("token_hash");
      const type = params.get("type");

      if (callbackError) {
        setError(callbackError.replace(/\+/g, " "));
        return;
      }
      if (!hash || (type !== "recovery" && type !== "invite")) {
        setError("This email link is incomplete. Request a new secure email.");
        return;
      }

      setTokenHash(hash);
      setConfirmationType(type);
      window.history.replaceState({}, "", window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  async function continueSecurely() {
    if (!auth.client || !tokenHash || !confirmationType) return;
    setVerifying(true);
    setError("");

    const verification = auth.client.auth.verifyOtp({
      token_hash: tokenHash,
      type: confirmationType,
    });
    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("Verification timed out.")), 12000);
    });

    try {
      const { error: verificationError } = await Promise.race([
        verification,
        timeout,
      ]);
      if (verificationError) {
        setError("This secure link is invalid or has expired. Request a new email.");
        setVerifying(false);
        return;
      }
      router.replace("/auth/update-password");
    } catch {
      setError("YELO could not verify this link. Please try again or request a new email.");
      setVerifying(false);
    }
  }

  return (
    <main className="auth-single-layout">
      <section className="auth-card compact">
        {error ? (
          <>
            <div className="auth-error" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <Link className="auth-submit focus-ring" href="/auth/forgot-password">
              Request another email
            </Link>
          </>
        ) : (
          <>
            <div className="auth-confirm-icon"><MailCheck size={30} /></div>
            <div>
              <p className="eyebrow">One-time email verification</p>
              <h1>Continue securely</h1>
              <p>
                Press the button below to verify this email action. Security
                scanners cannot activate it automatically.
              </p>
            </div>
            <div className="auth-notice">
              <ShieldCheck size={20} />
              <div>
                <strong>Newest email only</strong>
                <p>Each new request invalidates earlier recovery emails.</p>
              </div>
            </div>
            <button
              className="auth-submit focus-ring"
              type="button"
              disabled={!tokenHash || verifying}
              onClick={() => void continueSecurely()}
            >
              {verifying ? (
                <><LoaderCircle className="spin" size={19} /> Verifying...</>
              ) : (
                <>Continue to password setup <ArrowRight size={19} /></>
              )}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
