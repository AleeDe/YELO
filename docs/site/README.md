# Public landing page

The landing page source now lives at
[`apps/dashboard/landing/index.html`](../../apps/dashboard/landing/index.html).

It is deployed on **Vercel** together with the dashboard:

| Route | Serves |
|---|---|
| `/` | Landing page (plain HTML, APK download button) |
| `/app/` | Dashboard |

Assembly happens automatically: `apps/dashboard/package.json` runs
`scripts/assemble-site.mjs` as a `postbuild` hook after every `npm run build`,
which moves the dashboard's exported home page to `/app` and puts the landing
page at the root. This works regardless of the Vercel project's Root Directory
setting, because the hook fires wherever the build runs.

The Android build (`npm run cap:sync`) deliberately bypasses the hook - the
APK's webview must load the dashboard at its root, not the landing page.

## APK download

The download button points at the GitHub release:

```
https://github.com/AleeDe/YELO/releases/latest/download/YELO-v1.0.0.apk
```

Published under https://github.com/AleeDe/YELO/releases (tag `v1.0.0`).
