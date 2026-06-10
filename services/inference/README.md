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

The current `process_frame` hook validates and counts JPEG frames. YOLO,
tracking, zone rules, incident generation, and evidence upload are the next AI
service steps.
