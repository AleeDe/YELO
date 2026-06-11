# YELO MVP Scope

## Must Have

- Email/password authentication
- Super admin, society admin, and operator roles
- Multiple societies
- Multiple cameras per society
- Society-level data isolation
- Mobile camera support
- Webcam support
- Per-camera restricted zones
- Person and common waste-object detection
- Object tracking
- Possible littering event generation
- Evidence image storage
- Realtime dashboard notification
- Incident review and status updates
- Basic society and camera analytics

## Should Have

- Recorded-video testing
- Short evidence clips
- Camera online/offline status
- Configurable confidence and delay
- Email notification
- Audit logs
- Dataset feedback from false-positive reviews

## Could Have

- CCTV RTSP integration
- AWS EC2 deployment for the completed YOLO inference service
- Multiple restricted zones per camera
- Push notifications
- Heatmaps
- Scheduled monitoring
- Exportable incident reports

## Not in the MVP

- Custom garbage-detection model training
- Face recognition
- Automatic person identification
- Automatic fines or legal action
- Number-plate recognition
- Guaranteed detection of tiny or hidden waste
- Unlimited continuous cloud video recording
- Large-scale 24/7 cloud inference

The MVP uses a public pretrained YOLO model for the end-to-end system demo.
Training and validating a custom garbage model in Google Colab is a separate
model-improvement phase after the application workflow is finalized.
