# Full Application Walkthrough Script (single video)

One continuous screen recording: the complete application from zero - landing
page, sign-in, admin panel, cameras, zones, live demo - with the AI explained
along the way. Read the quoted text aloud; lines in **[brackets]** are actions,
not spoken.

Total: **about 9.5 minutes** at a natural pace. Record with Zoom or Win+Alt+R.

## Before recording

1. Gateway running: `python services/inference/server.py` (wait for
   `YOLO model ready`)
2. ngrok tunnel online
3. Dashboard: `npm run dev` (or the Vercel site)
4. Phone: YELO Capture installed, signed out, ready to pair
5. A restricted zone NOT yet drawn on the demo camera (you will draw it live)
6. A piece of litter in hand
7. Do one dry run - confirm an incident actually fires end to end

---

## 0. The problem (~45 s)

**[Screen: the landing page /, but do not scroll yet - or a plain title slide]**

> Assalam-o-alaikum. I am Muhammad Ali, presenting our group's semester
> project for CS-551 Artificial Intelligence at the University of Karachi,
> submitted to Sir Rana Zaeem Tariq.
>
> Let me start with a problem every residential society in Karachi knows.
> Somebody drops rubbish on the footpath and walks away. The guard did not see
> it - guards cannot watch every corner. The CCTV recorded it, but nobody
> reviews CCTV until somebody complains, and by then the person is long gone
> and unidentifiable.
>
> The obvious fix - record everything, all the time - creates two new
> problems. Storage for continuous video from every camera is expensive. And
> residents do not want to live under full-time surveillance.
>
> So the real question is: can a camera decide, by itself, the exact moment
> somebody drops litter - and save evidence of only that moment?

## 1. Our solution (~40 s)

**[Now scroll the landing page slowly: tagline, metrics, pipeline, event rule]**

> That is YELO - our answer to that question. It watches restricted areas and
> detects the act of littering itself: who was near, when the object was
> dropped, with photo and video proof. Nothing is recorded continuously;
> frames are analysed in memory and thrown away unless an event is confirmed.
>
> This public page shows the system honestly: our trained model's real
> numbers - mean average precision 0.513, precision 0.713, 75 millisecond
> inference on CPU - and the decision rule that makes it work.
>
> In this video I will build the whole thing up from zero: the admin panel,
> camera setup, the AI pipeline, and then a live demonstration of the system
> catching a littering event as it happens.

**[Click Open Dashboard]**

## 2. Sign-in and roles (~40 s)

**[Screen: sign-in page. Point at the "Use this device as a camera" option,
then sign in as a society admin]**

> The platform is multi-society and role-based. There are three roles. A super
> admin manages the whole platform and creates societies. A society admin
> manages one society: its cameras, zones, members and incidents. And an
> operator only reviews alerts - they cannot change any configuration.
>
> Notice this option as well: any phone can be used as a camera device without
> a full account, using a one-time pairing token. I will use that in a moment.
>
> I am signing in as a society administrator.

## 3. Dashboard overview (~35 s)

**[Screen: /dashboard overview page]**

> This is the admin panel. The overview shows live counts: incidents waiting
> for review, registered cameras, how many are online right now, and how many
> incidents have already been resolved.
>
> Every number here is scoped to my society only. Supabase row-level security
> guarantees that one society can never read another society's data.

## 4. Cameras and pairing (~80 s)

**[Go to Cameras. Show the list, then register a new camera or open the
existing demo camera]**

> The cameras page lists every registered camera with its status and a
> heartbeat, so we know when a device goes offline.
>
> Registering a camera generates a one-time pairing token. We never store the
> token itself, only its hash, so even the database cannot leak a usable
> credential.

**[On the phone: open YELO Capture, enter the pairing token, start the
camera. Show the phone screen if possible, or the dashboard reacting]**

> On the phone side, I open YELO Capture, enter that token once, and start the
> camera. The processor tile now shows "Receiving": the phone is sending about
> one frame per second to our inference gateway.
>
> Back on the dashboard, the camera has come online. We also get a live
> preview over WebRTC, and if the network blocks a direct connection it falls
> back to sampled frames. Continuous video is never uploaded or stored - that
> is a deliberate privacy decision.

## 5. Restricted zones (~50 s)

**[Open the camera's zone editor. Draw a polygon over the ground area, save]**

> Now the important configuration: restricted zones. I take a frame from this
> camera and draw a polygon over the area where littering should be detected -
> this footpath, for example.
>
> The coordinates are saved normalised, between zero and one, so the same zone
> works at any resolution. The AI only raises littering events inside these
> polygons; everything outside is ignored. Each camera also has its own
> confirmation delay, which I will explain in a moment.

## 6. The AI behind it (~90 s)

**[Screen: split between the gateway terminal and the code or README section 3]**

> Let me briefly explain what happens to every frame inside the gateway.
>
> First, detection. Our own model, yolo underscore garbage, a YOLOv8-small
> fine-tuned on the TACO litter dataset with transfer learning and data
> augmentation. It finds litter and people with confidence scores.
>
> Second, tracking. ByteTrack gives every object a persistent ID across
> frames. Detection alone is forgetful - every frame is a fresh look - but with
> tracking we can ask: has this object moved, and how long has it been there?
>
> Third, the decision. An incident needs five conditions at the same time:
> confidence above threshold, inside a restricted zone, a person tracked
> nearby recently, the object has stopped moving, and it stays still for the
> camera's confirmation delay.
>
> Think about what that rejects. A bottle sitting in a bin - no person nearby,
> no alert. Somebody carrying a bottle - it keeps moving, no alert. A one-frame
> false detection - gone the next frame, no alert. So the algorithm is not
> "detect trash". It is: detect the transition from carried to dropped, near a
> person, inside a monitored area. That rule is our own design, and it is why a
> model with 44 percent recall still works in practice - the system sees the
> same scene many times per second.

## 7. Live littering demonstration (~100 s)

**[Screen: dashboard live view of the camera. Walk into frame holding litter]**

> Now the live demonstration. I am walking into the camera's view holding a
> plastic bottle. You can see the system detecting me as a person, and the
> object moving with me - so the stationary condition fails, and no event
> starts.

**[Drop the litter inside the zone, step away, wait]**

> Now I have dropped it inside the zone and stepped away. The object is
> stationary, a person - me - was tracked next to it moments ago, and the
> confirmation timer is running.

**[Wait for the notification, then open the incident]**

> And there is the incident, with a realtime notification. It records the
> camera, the zone, the detected class, the confidence score, the timestamp,
> and the evidence photo. The gateway also attaches a before-and-after video
> clip, built from frames it kept in memory - sixty seconds either side of the
> event - so a reviewer can see exactly what happened.
>
> The reviewer can confirm it, mark it a false alarm, or resolve it. The
> system never accuses anybody automatically - a human always makes the final
> decision.

**[If the event does not fire within ~20 seconds: say "the confirmation delay
is still running" and wait calmly. Do not restart.]**

## 8. Rest of the admin panel (~45 s)

**[Quickly visit Analytics, Members, Settings]**

> Briefly, the rest of the panel. Analytics summarises incidents over time per
> camera and per zone. Members is where an admin invites operators and other
> admins to the society. And settings covers the society's configuration.
>
> There is also a separate super-admin dashboard for managing societies across
> the whole platform, and a restricted operator view for review-only staff.

## 9. Conclusion (~40 s)

**[Screen: back on the landing page or the metrics section]**

> To summarise: we trained our own YOLOv8 detector on the TACO dataset,
> combined it with ByteTrack tracking, and designed a five-condition event
> rule that separates littering from the mere presence of litter. The full
> pipeline runs on a laptop CPU at about thirteen frames per second, produces
> reviewable photo and video evidence, and keeps a human in the loop for every
> decision.
>
> Our honest limitations: recall is 0.436, person association is proximity
> based rather than pose based, and inference is CPU bound. All code, the
> trained model, the dataset link, the report and our AI usage declaration are
> in the submission. Thank you.

---

## Timing summary

| # | Section | Time | Running |
|---|---|---|---|
| 0 | The problem | 0:45 | 0:45 |
| 1 | Our solution | 0:40 | 1:25 |
| 2 | Sign-in and roles | 0:40 | 2:05 |
| 3 | Dashboard overview | 0:35 | 2:40 |
| 4 | Cameras and pairing | 1:20 | 4:00 |
| 5 | Restricted zones | 0:50 | 4:50 |
| 6 | The AI behind it | 1:30 | 6:20 |
| 7 | Live demonstration | 1:40 | 8:00 |
| 8 | Rest of the panel | 0:45 | 8:45 |
| 9 | Conclusion | 0:40 | 9:25 |

About nine and a half minutes - inside the 5-10 minute requirement. If you
run long, compress section 8; never cut section 7.

## Required-points coverage

| Required | Covered in |
|---|---|
| Problem statement | 0 |
| Dataset | 6 (TACO mention) and 9 |
| Model / algorithm | 6 |
| Code overview | 6 (gateway walkthrough) |
| Live execution | 4, 5, 7 |
| Results and conclusions | 1 (metrics), 9 |
