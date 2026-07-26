/**
 * Assemble the deployed site after the Next.js static export.
 *
 * Wanted layout:
 *
 *   /       the public landing page (landing/index.html, plain HTML)
 *   /app    the dashboard
 *
 * The dashboard exports its own home page to out/index.html, so this script
 * moves that page down to /app and puts the landing page at the root.
 *
 * It runs as the package.json `postbuild` hook, which means it works no
 * matter how Vercel is configured: whether the project's Root Directory is
 * the repository root or apps/dashboard, `npm run build` always triggers it.
 * Everything it needs lives inside apps/dashboard.
 *
 * Why the landing page must be plain HTML with no Next.js bundle: the
 * dashboard's auth provider redirects any route outside the public list to
 * sign-in. If the landing page loaded the dashboard's JavaScript, visitors
 * would bounce straight to the login page.
 */

import {
  existsSync, mkdirSync, copyFileSync, readdirSync, statSync, readFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..");
const outDir = join(appRoot, "out");
const landingSrc = join(appRoot, "landing", "index.html");

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

const dashboardRoot = join(outDir, "index.html");
const appDir = join(outDir, "app");

if (!existsSync(dashboardRoot)) {
  fail(`no ${dashboardRoot} found - did the Next.js export run?`);
}

// 1. Move the dashboard's exported root page to /app.
//
//    Guard against running twice over the same export: if out/index.html is
//    already the landing page (no Next.js bundle), copying it into /app
//    would overwrite the real dashboard page with the landing page.
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
