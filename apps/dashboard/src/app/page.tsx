"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Root route stub.
 *
 * On the deployed site this page never renders: the postbuild step replaces
 * out/index.html with public/landing.html (plain HTML, no bundle).
 *
 * It only runs in two places:
 *  - `next dev`, where no landing page is assembled - forward to the same
 *    landing document so localhost matches production;
 *  - the Android webview, whose start page is out/index.html from a plain
 *    `next build` - there the app must open on the dashboard, not the
 *    marketing page.
 */
export default function RootRedirect() {
  const router = useRouter();
  useEffect(() => {
    const capacitor = (window as unknown as { Capacitor?: unknown }).Capacitor;
    if (capacitor) {
      router.replace("/dashboard");
    } else {
      window.location.replace("/landing.html");
    }
  }, [router]);
  return null;
}
