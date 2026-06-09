# YELO

YELO is a multi-society, multi-camera AI-assisted littering detection and
incident review platform.

The planned MVP uses Next.js and Capacitor for the application, Supabase for
authentication, data, storage, and realtime alerts, and YOLO with OpenCV for
local object detection. Google Colab is used for model training and export.

Project planning and architecture documents are available in [`docs`](docs).

## Dashboard

The Next.js and Capacitor client lives in [`apps/dashboard`](apps/dashboard).

```bash
cd apps/dashboard
npm install
npm run dev
```

The interface standard is documented in
[`docs/HCI_UI_STANDARD.md`](docs/HCI_UI_STANDARD.md).
