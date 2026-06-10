# YELO Local Inference Gateway

This zero-dependency Python service receives sampled JPEG frames from YELO
Capture. It validates the camera token through Supabase and keeps only
in-memory frame metadata. Continuous video is not stored.

## Start on Windows PowerShell

From the repository root, the easiest command is:

```powershell
.\services\inference\start.ps1
```

It reads the existing public Supabase values from
`apps/dashboard/.env.local`. Alternatively, set them manually:

```powershell
$env:SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_ANON_KEY="your-anon-key"
python services/inference/server.py
```

Check `http://127.0.0.1:8000/health`. The response should report `ready`.

For a phone on the same Wi-Fi network, set the dashboard environment variable
to the laptop's LAN address:

```text
NEXT_PUBLIC_YELO_INFERENCE_URL=http://192.168.1.3:8000
```

Restart the Next.js development server and rebuild/sync Capacitor after changing
this value. Windows Firewall must allow Python on private networks.

By default, the gateway loads the small `yolo26n.pt` model on CPU. The first
run may download the public model weights. Configure another model with:

```powershell
$env:YELO_MODEL_PATH="D:\models\best.pt"
.\services\inference\start.ps1
```

Use your Colab-trained `best.pt` file here when it is ready. Other controls:

```text
YELO_MODEL_DEVICE=cpu
YELO_MODEL_CONFIDENCE=0.35
YELO_MODEL_IMAGE_SIZE=640
YELO_DETECTION_CLASSES=person,bottle,cup
YELO_TRACKER_CONFIG=bytetrack.yaml
YELO_TRACKER_STALE_SECONDS=120
```

The service now returns normalized boxes, labels, confidence, and inference
time. ByteTrack maintains stable object IDs separately for every camera and
returns normalized center-point trails and movement deltas. Inactive tracker
state is removed automatically. Active restricted-zone polygons are evaluated
against each tracked object's bottom-center ground point and returned with the
matching detection.

The MVP event rule associates a nearby tracked person when a waste-like object
first appears in a restricted zone. The waste track must remain nearly
stationary for the camera's configured confirmation delay. Confirmed events are
reported asynchronously to the `report-camera-event` Supabase Edge Function,
which validates the camera token, uploads only the evidence JPEG, inserts the
incident records, and creates realtime member notifications. Per-track
cooldowns prevent duplicate alerts without suppressing a different waste item.

Event controls:

```text
YELO_EVENT_STATIONARY_DISTANCE=0.015
YELO_EVENT_PERSON_DISTANCE=0.3
YELO_EVENT_COOLDOWN_SECONDS=120
YELO_WASTE_CLASSES=bottle,cup,bowl,banana,apple,orange,backpack,handbag,suitcase
```

The public pretrained model is useful for people and common COCO objects. It is
not a complete littering model. Replace it with the Colab-trained `best.pt` that
contains the project waste classes before evaluating littering accuracy.

## Dashboard live preview

Capture publishes its browser camera stream directly to authenticated dashboard
viewers through WebRTC. Supabase Realtime Broadcast carries only the
offer/answer and ICE signaling messages over an unguessable per-camera topic;
the video itself travels peer-to-peer. Each camera device accepts up to four
simultaneous viewers.

Capture also publishes one private JPEG every two seconds to the
`camera-live-frame` Edge Function. The function overwrites a single object per
camera in the private `camera-live-frames` bucket. This remains the fallback
when WebRTC is connecting or direct peer connectivity is blocked, without
retaining continuous footage. Confirmed incident evidence is stored separately.
