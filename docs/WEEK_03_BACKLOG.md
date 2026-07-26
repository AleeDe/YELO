# Week 3 Backlog

## Frame Ingestion

- [x] Define a common JPEG frame contract
- [x] Add local camera-token validation
- [x] Send compressed mobile and webcam frames once per second
- [x] Show frame delivery and gateway health in Capture
- [x] Avoid continuous-frame storage
- [x] Add YOLO model loading and object detections
- [x] Add object tracking

## Restricted Zones

- [x] Draw a polygon over a captured camera frame
- [x] Save normalized polygon coordinates per camera
- [x] Validate at least three polygon points
- [x] Overlay the active zone during local processing

## Event Pipeline

- [x] Define person and waste-object association rules
- [x] Add littering confirmation timer
- [x] Upload incident evidence only
- [x] Insert detection event and media records
- [x] Publish realtime dashboard notifications

## Demo Target

One mobile camera and one webcam can send sampled frames to the local laptop.
The local service validates each camera, processes frames in memory, runs YOLO
tracking, and reports objects that enter an active restricted zone.

## Later Deployment Milestone - not pursued

The original plan was to deploy the inference service to AWS EC2 once local
tracking, restricted zones, and incident generation were stable.

**Outcome: we did not deploy to AWS.** We investigated it and decided against
it for this submission:

- CPU inference on a small free-tier instance (1-2 GB RAM) is slower than on a
  development laptop, so it would have made the live demo worse, not better.
- The gateway keeps a 60-second frame buffer in memory for evidence clips,
  which does not fit comfortably in free-tier memory.
- A GPU instance would solve both problems but is not free.

Instead, the model runs on a laptop and is exposed over HTTPS through a
reserved **ngrok** tunnel. This gives a stable public URL for the mobile app at
no cost. See `DEMO_RUNBOOK.md`.

- [x] Measure CPU performance before considering a paid GPU instance
- [x] Connect Capture clients to an HTTPS inference endpoint (via ngrok)
- [x] Keep camera-token validation enabled on the public endpoint
- [ ] ~~Containerize the Python and YOLO inference service~~ (not pursued)
- [ ] ~~Deploy the container to an AWS EC2 instance~~ (not pursued)
- [ ] ~~Store configuration in AWS-managed secrets~~ (not pursued)
