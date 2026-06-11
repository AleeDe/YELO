# Week 4 Field Test

## Goal

Validate one real mobile camera from capture through WebRTC preview, YOLO
tracking, restricted-zone evaluation, littering confirmation, private evidence,
incident review, and realtime notification.

## Before Testing

1. Start the dashboard:

   ```powershell
   cd apps/dashboard
   npm run dev
   ```

2. Start the local inference gateway:

   ```powershell
   .\services\inference\start.ps1
   ```

3. Run the non-destructive smoke test:

   ```powershell
   cd apps/dashboard
   npm run test:field
   ```

4. Keep the phone and laptop on the same network for the first WebRTC test.
5. Keep YELO Capture visible on the phone. Mobile browsers may suspend camera
   access in the background.

## Physical Scenario

1. Pair the registered mobile camera and start its rear camera.
2. Open that camera from the administrator dashboard on the laptop.
3. Run **Automatic checks** in the **End-to-end camera test** panel.
4. Verify body movement appears through WebRTC with no multi-second delay.
5. Create or verify one restricted polygon over a clear ground area.
6. Stand near the polygon with a visible bottle or cup.
7. Place the item inside the polygon and leave it stationary for the configured
   confirmation delay.
8. Wait for the Capture timer to finish.
9. Open the resulting dashboard notification.
10. Verify the incident camera, zone, class, confidence, timestamp, and private
    evidence image.
11. Record the human decision as confirmed, false alert, or under review.

## Acceptance Criteria

- Camera heartbeat remains under 40 seconds old.
- Sampled fallback frame remains under 10 seconds old.
- WebRTC state becomes connected on the same network.
- YOLO gateway reports ready with a loaded model.
- At least one active restricted zone exists.
- A bottle or cup alone, without a nearby tracked person, does not start an
  event timer.
- Moving waste restarts the stationary timer.
- Confirmed waste creates exactly one incident per track during cooldown.
- Incident evidence is accessible only to authenticated society members.
- Notification opens the correct incident.
- Capture remains active while the dashboard is open on another device or tab.

## Record During Testing

- Camera device and browser version
- Laptop browser version
- Network type
- WebRTC result: connected or sampled fallback
- Approximate preview latency
- Detected object class
- False positive or missed detection
- Confirmation duration
- Incident and evidence result

## Known MVP Limits

- The public COCO model recognizes common objects such as bottles and cups but
  is not a complete garbage model.
- Recorded-video ingestion is deferred; the working demo sources are mobile
  cameras and webcams.
- Direct WebRTC can fail on restrictive NAT or firewall configurations without
  a TURN relay.
- Camera capture can stop when a mobile browser is backgrounded.
- Tiny, hidden, or heavily occluded waste may not be detected reliably.
