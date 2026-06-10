# Week 3 Backlog

## Frame Ingestion

- [x] Define a common JPEG frame contract
- [x] Add local camera-token validation
- [x] Send compressed mobile and webcam frames once per second
- [x] Show frame delivery and gateway health in Capture
- [x] Avoid continuous-frame storage
- [x] Add YOLO model loading and object detections
- [ ] Add object tracking

## Restricted Zones

- [ ] Draw a polygon over a captured camera frame
- [ ] Save normalized polygon coordinates per camera
- [ ] Validate at least three polygon points
- [ ] Overlay the active zone during local processing

## Event Pipeline

- [ ] Define person and waste-object association rules
- [ ] Add littering confirmation timer
- [ ] Upload incident evidence only
- [ ] Insert detection event and media records
- [ ] Publish realtime dashboard notifications

## Demo Target

One mobile camera and one webcam can send sampled frames to the local laptop.
The local service validates each camera, processes frames in memory, and reports
delivery health before YOLO and event generation are enabled.

## Later Deployment Milestone

Deploy the completed inference service to AWS only after local tracking,
restricted zones, and incident generation are stable.

- [ ] Containerize the Python and YOLO inference service
- [ ] Deploy the container to an AWS EC2 instance
- [ ] Add a domain and HTTPS reverse proxy
- [ ] Store Supabase and model configuration in AWS-managed secrets
- [ ] Restrict inbound traffic and keep camera-token validation enabled
- [ ] Connect Vercel Capture clients to the HTTPS inference endpoint
- [ ] Add health checks, logs, restart policy, and cost alerts
- [ ] Measure CPU performance before considering a paid GPU instance
