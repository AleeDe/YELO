# YELO - Week 1 Project Plan

## 1. Project Vision

YELO is a multi-society littering detection and incident review platform.
Each society can register multiple cameras, define restricted areas, and review
AI-generated littering alerts. A super administrator can manage and monitor the
whole platform.

The system is an AI-assisted monitoring tool. It flags possible incidents for
human review instead of automatically accusing or identifying a person.

## 2. MVP Objective

Demonstrate the complete workflow with two societies and at least two camera
records per society:

1. A society administrator signs in.
2. The administrator registers a camera.
3. A mobile camera, webcam, or recorded video sends frames for processing.
4. The administrator defines a restricted zone for that camera.
5. AI detects and tracks people and waste objects.
6. The event engine identifies a possible littering event.
7. The system stores evidence and creates an alert.
8. The administrator reviews and resolves the incident.

Only one or two live streams need to run simultaneously for the university
demo. Other registered cameras can use recorded videos.

## 3. Technology Stack

### Application

- Next.js with TypeScript
- Capacitor for Android/mobile camera access
- Tailwind CSS for the interface
- Supabase Authentication
- Supabase PostgreSQL database
- Supabase Storage for evidence
- Supabase Realtime for dashboard alerts
- Supabase Row Level Security for society data isolation

### AI

- Python
- Ultralytics YOLO
- OpenCV
- ByteTrack or BoT-SORT
- Google Colab for training and model export
- Local laptop for live MVP inference

## 4. Zero-Cost Strategy

The project can remain at zero monetary cost during development by using:

- Free and open-source frameworks
- Supabase free tier
- Google Colab free runtime for training
- Local laptop inference for the live demo
- Mobile phone and laptop webcam as camera devices
- Local or compressed Supabase evidence storage

Important limitations:

- Google Colab is not an always-on production inference server.
- Free services have storage, bandwidth, compute, and session limits.
- CCTV RTSP streams cannot normally be sent directly to a browser.
- A production deployment with many continuous cameras will eventually need
  paid compute and storage.

## 5. User Roles

### Super Admin

- Create and manage societies
- Invite society administrators
- View all cameras and incidents
- View platform-wide analytics
- Disable societies, users, or cameras

### Society Admin

- View only their society
- Invite society operators
- Register and configure cameras
- Draw restricted zones
- Review and resolve incidents
- View society analytics

### Operator

- View assigned society cameras
- Review alerts
- Confirm, reject, or resolve incidents
- Cannot manage societies or platform settings

## 6. Camera Types

All camera sources use one logical camera record and a common frame-processing
contract.

### Mobile Camera

The Capacitor application captures frames or short video segments and sends
them to the inference service with a secure camera token.

### Webcam

The browser can use `getUserMedia`, or the local Python inference service can
read a USB webcam directly with OpenCV.

### CCTV Camera

The local inference service reads an RTSP stream. This is part of the
architecture but is not required for the first live demonstration.

### Recorded Video

An administrator uploads or selects a test video. It passes through the same
detection and event pipeline as a live stream.

## 7. Littering Event Definition

The MVP should not generate an incident merely because waste is visible.

A possible littering event requires:

1. A person is present near a restricted zone.
2. A waste object appears near that person.
3. The waste object separates from the person.
4. The waste object remains stationary inside the restricted zone.
5. The person moves away.
6. The condition remains valid for a configurable confirmation delay.

Each incident must include:

- Society and camera
- Detection timestamp
- Evidence image
- Optional short video clip
- Detected waste category
- AI confidence score
- Incident status
- Reviewer and review notes

## 8. Incident Statuses

- `new`
- `under_review`
- `confirmed`
- `false_positive`
- `resolved`

## 9. Core Data Model

The initial database requires these entities:

- `profiles`
- `societies`
- `society_members`
- `cameras`
- `restricted_zones`
- `detection_events`
- `event_media`
- `notifications`
- `audit_logs`

Every society-owned row must include `society_id`. Supabase Row Level Security
must prevent users from reading or changing data owned by another society.

## 10. High-Level Architecture

```text
Mobile / Browser / Webcam / CCTV / Video
                    |
                    v
          Local Python AI Service
        YOLO + Tracking + Zone Rules
                    |
                    v
       Supabase Database and Storage
                    |
             Supabase Realtime
                    |
                    v
       Next.js / Capacitor Dashboard
```

The camera source sends frames to the local inference service. The inference
service processes frames and uploads only incident metadata and evidence.
Continuous raw video is not uploaded to Supabase.

## 11. Privacy and Security Requirements

- Do not implement face recognition in the MVP.
- Do not label a person as guilty automatically.
- Store only incident evidence, not all continuous video.
- Protect camera connections with revocable tokens.
- Use signed URLs for private evidence.
- Record important administrative actions in audit logs.
- Show a retention period for incident media.
- Apply Row Level Security to every society-owned table.

## 12. Week 1 Tasks

- [x] Define project vision
- [x] Define MVP scope
- [x] Select the technology stack
- [x] Define roles and permissions
- [x] Define supported camera sources
- [x] Define the incident lifecycle
- [x] Draft the core data model
- [x] Define the zero-cost deployment strategy
- [ ] Inspect and document the existing repository
- [ ] Create final database entity relationship diagram
- [ ] Create dashboard wireframes
- [ ] Create development environment files
- [ ] Confirm the local machine can run YOLO inference
- [ ] Prepare the Week 2 backlog

## 13. Week 1 Acceptance Criteria

Week 1 is complete when:

- The team agrees on MVP and non-MVP features.
- Roles and permissions are unambiguous.
- Camera input and inference responsibilities are separated.
- The database design supports multiple societies and cameras.
- The dashboard pages are mapped.
- The AI service boundary is documented.
- The repository can run locally with documented setup steps.

## 14. Definition of Demo Success

The final MVP succeeds when:

1. Two societies exist with isolated data.
2. Each society has at least two registered cameras.
3. One phone camera and one webcam or video source work.
4. Restricted zones can be configured per camera.
5. A staged littering action generates an incident.
6. Evidence appears in the correct society dashboard.
7. An administrator can review and resolve the incident.
8. A false alert can be rejected and retained for evaluation.

