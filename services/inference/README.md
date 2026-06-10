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
state is removed automatically.

Restricted-zone rules, incident generation, and evidence upload remain the next
pipeline steps.

The public pretrained model is useful for people and common COCO objects. It is
not a complete littering model. Replace it with the Colab-trained `best.pt` that
contains the project waste classes before evaluating littering accuracy.
