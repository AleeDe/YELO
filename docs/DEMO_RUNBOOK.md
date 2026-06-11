# YELO Demo Runbook

How to run a live YELO demo (camera capture → local YOLO model → dashboard).

The model runs on **this laptop**. A permanent ngrok tunnel exposes it over HTTPS
so the web app and the Android (Capacitor) app can reach it from anywhere, and so
the URL never changes when the laptop's Wi-Fi IP changes.

**Permanent inference endpoint:**
`https://nonexportable-clorinda-overhardy.ngrok-free.dev`

This URL is already baked into the app as the default processor URL.

---

## Each demo — start these (leave all windows running)

### 1. Start the model gateway
```powershell
cd D:\University\AI\Assignment\YELO\services\inference
python server.py
```
Wait for `YOLO model ready: yolo26m.pt`. It listens on `:8000`.

### 2. Start the permanent tunnel (new window)
```powershell
ngrok http --domain=nonexportable-clorinda-overhardy.ngrok-free.dev 8000
```
Wait for `Session Status: online`.

### 3. Open the app
- Web: `cd apps\dashboard; npm run dev` then open http://localhost:3000
- Android: install the latest APK from
  `apps\dashboard\android\app\build\outputs\apk\debug\app-debug.apk`

Go to the capture page -> **Start camera**. The **Processor** tile should
show **Receiving** and "Frames sent" should count up.

## To stop
`Ctrl+C` in each window. Restart anytime — the ngrok URL stays the same forever,
so nothing needs to be re-pasted.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Processor tile says **Unavailable** | Open **Processor connection** on the capture page; confirm URL is `https://nonexportable-clorinda-overhardy.ngrok-free.dev` (a stored value in the browser/app overrides the default). |
| ngrok not `online` | Restart step 2. If "authtoken" error: `ngrok config add-authtoken <token>` once. |
| ngrok "agent too old" | `ngrok update` |
| Gateway has no model | Confirm `python server.py` printed `YOLO model ready`. Check `ultralytics`, `opencv-python`, `torch` are installed. |
| Check model health | `curl http://127.0.0.1:8000/health` — look for `"modelReady": true`. |

## One-time setup (already done, for reference)
- `cloudflared` and `ngrok` installed and on PATH.
- ngrok: free account, authtoken saved (`ngrok config add-authtoken <token>`),
  reserved static domain `nonexportable-clorinda-overhardy.ngrok-free.dev`.
- App default endpoint set in `apps/dashboard/.env.local`
  (`NEXT_PUBLIC_YELO_INFERENCE_URL`); rebuild + `npx cap sync android` after any change.

## Notes
- The gateway listens on `0.0.0.0:8000`; the tunnel forwards public HTTPS to it.
- The app is served over HTTPS, so the processor URL must be HTTPS — the tunnel
  provides that. A raw `http://<lan-ip>` would be blocked by mixed-content.
- Windows Firewall only matters for direct LAN access; through the tunnel it is
  not required.
