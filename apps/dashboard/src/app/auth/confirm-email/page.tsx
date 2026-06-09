"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, LoaderCircle, MailCheck, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { supabaseUrl } from "@/lib/supabase/config";

export default function ConfirmEmailPage() {
  const auth = useAuth();
  const router = useRouter();
  const exchangeStarted = useRef(false);
  const [confirmationUrl, setConfirmationUrl] = useState("");
  const [error, setError] = useState("");
  const [exchanging, setExchanging] = useState(true);

  useEffect(() => {
    if (!auth.client || exchangeStarted.current) return;
    exchangeStarted.current = true;

    async function prepareConfirmation() {
      if (!auth.client) return;
      const params = new URLSearchParams(window.location.search);
      const callbackError = params.get("error_description");
      const code = params.get("code");
      const nestedUrl = params.get("confirmation_url");

      if (callbackError) {
        setError(callbackError.replace(/\+/g, " "));
        setExchanging(false);
        return;
      }

      if (code) {
        const { error: exchangeError } =
          await auth.client.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError("This secure link is invalid or has expired. Request a new email.");
          setExchanging(false);
          return;
        }
        window.history.replaceState({}, "", window.location.pathname);
        router.replace("/auth/update-password");
        return;
      }

      if (!nestedUrl || !supabaseUrl) {
        setError("This email link is incomplete. Request a new secure email.");
        setExchanging(false);
        return;
      }

      try {
        const candidate = new URL(nestedUrl);
        const projectUrl = new URL(supabaseUrl);
        if (
          candidate.origin !== projectUrl.origin ||
          candidate.pathname !== "/auth/v1/verify"
        ) {
          throw new Error("Unexpected confirmation destination.");
        }
        setConfirmationUrl(candidate.toString());
      } catch {
        setError("This confirmation link is not valid.");
      }
      setExchanging(false);
    }

    void prepareConfirmation();
  }, [auth.client, router]);

  return (
    <main className="auth-single-layout">
      <section className="auth-card compact">
        {exchanging ? (
          <div className="auth-success" role="status">
            <LoaderCircle className="spin" size={34} />
            <h1>Checking secure email</h1>
            <p>Please wait while YELO prepares the next step.</p>
          </div>
        ) : error ? (
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
              <p className="eyebrow">Email verified by you</p>
              <h1>Continue securely</h1>
              <p>
                Press the button below to use this one-time link. This extra step
                prevents email security scanners from consuming it first.
              </p>
            </div>
            <div className="auth-notice">
              <ShieldCheck size={20} />
              <div>
                <strong>One-time action</strong>
                <p>Use the newest email and press this button only once.</p>
              </div>
            </div>
            <a className="auth-submit focus-ring" href={confirmationUrl}>
              Continue to password setup <ArrowRight size={19} />
            </a>
          </>
        )}
      </section>
    </main>
  );
}
