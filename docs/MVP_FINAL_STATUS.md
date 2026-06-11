# YELO MVP Final Status

Status date: June 10, 2026

## Release Boundary

The application MVP is complete for a local, zero-cost university demonstration
using a mobile camera or webcam and the public pretrained YOLO model.

The custom garbage dataset and model are intentionally deferred. They improve
detection accuracy but are not required to demonstrate the complete camera,
restricted-zone, alert, and incident-review workflow.

## Implemented

- Supabase email authentication and password recovery
- Super administrator, society administrator, and operator roles
- Multiple societies and multiple cameras per society
- Row Level Security for society data isolation
- Camera registration, edit, delete, secure token pairing, and heartbeat
- Mobile and webcam capture
- Peer-to-peer WebRTC preview with private sampled-frame fallback
- Local YOLO detection with per-camera ByteTrack tracking
- Per-camera restricted-zone drawing and normalized coordinates
- Person and waste association with stationary confirmation
- Private incident evidence storage
- Realtime notifications and incident review
- Responsive role-specific dashboards and settings
- Capacitor Android project

## Automated Verification

The following checks passed on June 10, 2026:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- Inference `/health` with `yolo26m.pt` loaded on CPU
- `npm run test:field`
- Supabase realtime signaling smoke test

## Final Manual Demo

1. Start the dashboard and inference service.
2. Register and pair one mobile camera.
3. Start Capture and keep the page visible.
4. Open the camera from the administrator dashboard.
5. Verify WebRTC preview or sampled-frame fallback.
6. Draw and save a restricted area.
7. Place a detectable bottle or cup in that area near a person.
8. Wait for the configured confirmation delay.
9. Verify one notification, incident record, and private evidence image.
10. Mark the incident confirmed, under review, or false alert.

## Deferred Work

- Train and validate a custom garbage model in Google Colab
- Add recorded-video ingestion
- Containerize and deploy inference to AWS
- Add TURN for restrictive networks
- Add push/email alerts, clips, exports, and audit logs

These are post-MVP improvements and do not block the current demonstration.
