# Public landing page

A single self-contained HTML page describing the project, with a download
button for the Android APK.

`index.html` has no external dependencies - no CDN, no fonts, no analytics -
so it works offline and loads instantly.

---

## Step 1: Publish the APK to GitHub Releases

The download button points at:

```
https://github.com/AleeDe/YELO/releases/latest/download/YELO-v1.0.0.apk
```

That URL only works once a release exists. Create one:

**Option A - GitHub website (easiest)**

1. Go to https://github.com/AleeDe/YELO/releases/new
2. Click **Choose a tag**, type `v1.0.0`, select **Create new tag**
3. Release title: `YELO v1.0.0`
4. Drag `artifacts/YELO-v1.0.0.apk` into the attachments box
5. Click **Publish release**

**Option B - command line**

Requires `gh auth login` first (a browser sign-in; it cannot be automated
without your GitHub credentials).

```bash
gh release create v1.0.0 artifacts/YELO-v1.0.0.apk \
  --title "YELO v1.0.0" \
  --notes "Android app for the YELO littering detection system. Pair with a camera token from the dashboard."
```

Verify afterwards by opening the download URL above in a private window.

---

## Step 2: Publish the page with GitHub Pages

1. Go to https://github.com/AleeDe/YELO/settings/pages
2. Under **Source**, select **Deploy from a branch**
3. Branch: `main`, folder: `/docs`
4. Click **Save**

After a minute or two the site is live at:

```
https://aleede.github.io/YELO/site/
```

> GitHub Pages serves from `/docs`, and this page lives in `docs/site/`, hence
> the `/site/` on the end. To serve it from the root URL instead, move
> `index.html` up into `docs/`.

**The repository must be public** for GitHub Pages to work on a free account.

---

## Why GitHub Releases rather than Supabase

Hosting the APK on Supabase Storage would work technically, but it is the wrong
place for it:

- The free tier has limited storage and egress bandwidth.
- Every download consumes that quota.
- If the quota is exhausted the project can be paused - and the same Supabase
  project runs the live demonstration.

GitHub Releases is free, has no meaningful bandwidth limit for this purpose, and
is completely separate from the infrastructure the demo depends on.

---

## Updating the page

Edit `index.html` and push. GitHub Pages redeploys automatically within a minute
or so.

All metrics on the page are read from the trained checkpoint and should match
`PROJECT_REPORT.md`:

| Metric | Value |
|---|---|
| mAP@0.5 | 0.513 |
| mAP@0.5:0.95 | 0.366 |
| Precision | 0.713 |
| Recall | 0.436 |
| CPU inference | 75 ms at 480 px |
