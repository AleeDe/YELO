/**
 * Post-build step: put the public landing page at the site root.
 *
 * Deployed layout:
 *
 *   /            landing/index.html - plain HTML, no Next.js bundle
 *   /dashboard   the signed-in overview (a real Next.js route)
 *
 * The dashboard lives at /dashboard as an ordinary route, so the only work
 * here is replacing the exported root page (a dev-only redirect stub) with
 * the landing page.
 *
 * Runs as the package.json `postbuild` hook, so it fires after every
 * `npm run build` regardless of where Vercel builds from. The Android build
 * (cap:sync) calls `next build` directly to skip it - the APK's webview must
 * start on the redirect stub, not the landing page.
 *
 * Why the landing page must carry no /_next/ reference: the dashboard's auth
 * provider redirects any route outside the public list to sign-in, so if the
 * landing page loaded the dashboard bundle, visitors would bounce straight
 * to the login page.
 */

import { existsSync, copyFileSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..");
const outDir = join(appRoot, "out");
const landingSrc = join(appRoot, "public", "landing.html");

function fail(message) {
  console.error(`assemble-site: ${message}`);
  process.exit(1);
}

if (!existsSync(outDir)) {
  fail(`export directory not found: ${outDir} - did next build run?`);
}
if (!existsSync(landingSrc)) {
  fail(`landing page not found: ${landingSrc}`);
}

// 1. Landing page replaces the exported root page.
const rootPage = join(outDir, "index.html");
copyFileSync(landingSrc, rootPage);
console.log("assemble-site: landing page -> /index.html (no Next.js bundle)");

const landingHtml = readFileSync(rootPage, "utf8");
if (landingHtml.includes("/_next/")) {
  fail(
    "landing page references /_next/ - the dashboard router would load and " +
      "redirect visitors to the sign-in page",
  );
}
console.log("assemble-site: verified landing page has no /_next/ references");

// 2. /dashboard must exist and be the real application.
const dashboardPage = join(outDir, "dashboard", "index.html");
if (!existsSync(dashboardPage)) {
  fail("out/dashboard/index.html missing - the overview route did not export");
}
const dashboardHtml = readFileSync(dashboardPage, "utf8");
if (!dashboardHtml.includes("/_next/")) {
  fail("/dashboard/index.html has no Next.js bundle - the dashboard is missing");
}
if (dashboardHtml.includes("Download APK")) {
  fail("/dashboard/index.html looks like the landing page, not the dashboard");
}
console.log("assemble-site: verified /dashboard serves the application");

// 3. Report what is being served, as a build-log sanity check.
const entries = readdirSync(outDir)
  .filter((name) => statSync(join(outDir, name)).isDirectory())
  .sort();
console.log(`assemble-site: routes available: /, ${entries.map((e) => `/${e}`).join(", ")}`);
