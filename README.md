# YELO

YELO is a multi-society, multi-camera AI-assisted littering detection and
incident review platform.

The working MVP uses Next.js and Capacitor for the application, Supabase for
authentication, data, private evidence storage, and realtime alerts, and a
local YOLO and OpenCV service for object detection and tracking. Mobile and
webcam capture clients support secure camera pairing, restricted areas,
low-latency WebRTC preview, and sampled-frame fallback.

Project planning and architecture documents are available in [`docs`](docs).
The current release boundary and verification results are recorded in
[`docs/MVP_FINAL_STATUS.md`](docs/MVP_FINAL_STATUS.md).

## Dashboard

The Next.js and Capacitor client lives in [`apps/dashboard`](apps/dashboard).

```bash
cd apps/dashboard
npm install
npm run dev
```

The interface standard is documented in
[`docs/HCI_UI_STANDARD.md`](docs/HCI_UI_STANDARD.md).

## Local Frame Ingestion

The zero-cost Python inference gateway lives in
[`services/inference`](services/inference). It accepts sampled JPEG frames from
mobile and webcam Capture clients, validates camera tokens, runs YOLO tracking,
evaluates restricted zones, and reports confirmed incidents. See its README for
local and phone-on-Wi-Fi setup.

## Release Checks

```bash
cd apps/dashboard
npm run lint
npm run typecheck
npm run build
npm run test:field
```

Start `services/inference/start.ps1` before running `test:field`.
