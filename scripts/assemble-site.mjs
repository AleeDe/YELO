/**
 * Assemble the deployed site after the Next.js static export.
 *
 * The dashboard exports to apps/dashboard/out/ with its own page at the root.
 * We want:
 *
 *   /       the public landing page (docs/site/index.html)
 *   /app    the dashboard
 *
 * So this script moves the exported dashboard root page down into /app and
 * puts the landing page at the root. Every other exported route (cameras,
 * incidents, capture, and so on) stays where it is, because the dashboard
 * links to them by absolute path.
 *
 * Run automatically by vercel.json after `next build`.
 */

import {
  existsSync, mkdirSync, copyFileSync, readdirSync, statSync, readFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const outDir = join(repoRoot, "apps", "dashboard", "out");
const landingSrc = join(repoRoot, "docs", "site", "index.html");

function fail(message) {
  console.error(`assemble-site: ${message}`);
  process.exit(1);
}

if (!existsSync(outDir)) {
  fail(`export directory not found: ${outDir}`);
}
if (!existsSync(landingSrc)) {
  fail(`landing page not found: ${landingSrc}`);
}

// 1. Move the dashboard's exported root page to /app.
//    With trailingSlash: true the export writes out/index.html for the
//    dashboard home route.
const dashboardRoot = join(outDir, "index.html");
const appDir = join(outDir, "app");

if (!existsSync(dashboardRoot)) {
  fail(`no ${dashboardRoot} found - did the Next.js export run?`);
}

// Guard against running twice over the same export: if out/index.html is
// already the landing page (no Next.js bundle), copying it into /app would
// overwrite the real dashboard page with the landing page.
const rootHtml = readFileSync(dashboardRoot, "utf8");
if (rootHtml.includes("/_next/")) {
  mkdirSync(appDir, { recursive: true });
  copyFileSync(dashboardRoot, join(appDir, "index.html"));
  console.log("assemble-site: dashboard home -> /app/index.html");
} else if (existsSync(join(appDir, "index.html"))) {
  console.log("assemble-site: /app already assembled, leaving it alone");
} else {
  fail(
    "out/index.html is not the dashboard export and /app/index.html is " +
      "missing - run `npm run build` first",
  );
}

// 2. Landing page becomes the new root.
//
//    It is written as plain HTML with no Next.js bundle. That matters: the
//    dashboard's auth provider redirects any route outside /auth and /capture
//    to the sign-in page, so if the landing page loaded the dashboard's
//    JavaScript it would bounce visitors straight to login. Serving it as a
//    standalone document keeps the router out of it entirely.
copyFileSync(landingSrc, dashboardRoot);
console.log("assemble-site: landing page -> /index.html (no Next.js bundle)");

// Sanity check: the landing page must not pull in the dashboard runtime.
const landingHtml = readFileSync(dashboardRoot, "utf8");
if (landingHtml.includes("/_next/")) {
  fail(
    "landing page references /_next/ - the dashboard router would load and " +
      "redirect visitors to the sign-in page",
  );
}
console.log("assemble-site: verified landing page has no /_next/ references");

// 3. The reverse check: /app must be the dashboard, never the landing page.
//    Getting this backwards would hand visitors a marketing page where the
//    application should be, which is easy to miss because both routes still
//    return 200.
const appHtml = readFileSync(join(appDir, "index.html"), "utf8");
if (!appHtml.includes("/_next/")) {
  fail("/app/index.html has no Next.js bundle - the dashboard is missing");
}
if (appHtml.includes("Download APK")) {
  fail("/app/index.html looks like the landing page, not the dashboard");
}
console.log("assemble-site: verified /app serves the dashboard");

// 4. Report what is being served, as a build-log sanity check.
const entries = readdirSync(outDir)
  .filter((name) => statSync(join(outDir, name)).isDirectory())
  .sort();
console.log(`assemble-site: routes available: /, ${entries.map((e) => `/${e}`).join(", ")}`);
