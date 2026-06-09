# YELO Dashboard

Responsive Next.js and Capacitor client for the YELO multi-society monitoring
platform.

## Local Setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Set the public Supabase URL and anonymous key in `.env.local`. Never place a
Supabase service-role key in this application.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Android

The Capacitor Android project is included in `android`.

```bash
npm run cap:sync
npx cap open android
```

`cap:sync` creates a static Next.js export and copies it into the native
project.

## Interface Standard

Interaction and accessibility requirements are documented in
[`../../docs/HCI_UI_STANDARD.md`](../../docs/HCI_UI_STANDARD.md).
