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

## Authentication Setup

1. Open the Supabase project dashboard.
2. Go to **Project Settings > API Keys**.
3. Copy the public `anon` or publishable key into
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
4. In **Authentication > URL Configuration**, add:
   - `http://localhost:3000/auth/update-password`
   - `http://192.168.1.3:3000/auth/update-password`
   - The production HTTPS callback when deployed
5. Create users in Supabase Authentication and assign their access in
   `profiles` and `society_members`.

Never use the `service_role` or secret key in the browser application.

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
