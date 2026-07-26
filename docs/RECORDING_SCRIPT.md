# Screen Recording Script

A timed script for the 5-10 minute demonstration video. Target: **8 minutes**,
which leaves room to slow down without overrunning.

Covers all six required points: problem statement, dataset, model/algorithm,
code overview, live execution, results and conclusions.

---

## Before you hit record

**Start these and leave them running:**

1. Gateway: `python services/inference/server.py`
   - wait for `YOLO model ready: models/yolo_garbage.pt`
2. Tunnel: `ngrok http --domain=nonexportable-clorinda-overhardy.ngrok-free.dev 8000`
   - wait for `Session Status: online`
3. Dashboard: `cd apps/dashboard` then `npm run dev`
4. Phone: open YELO Capture, sign in, do **not** start the camera yet

**Have these tabs open, in this order** so you can move left to right:

| Tab | Content |
|---|---|
| 1 | `README.md` (rendered) |
| 2 | `docs/colab_train_garbage.ipynb` scrolled to the results plots |
| 3 | `services/inference/server.py` |
| 4 | Dashboard - incidents page |
| 5 | Dashboard - capture/camera page |
| 6 | Terminal running the gateway |

**Physical setup:**

- A piece of litter in hand (bottle or wrapper)
- The restricted zone already drawn on the camera you will use
- Phone propped up so it sees the zone and you can step into frame

**Do a dry run first.** Confirm an incident actually fires end to end before
recording. Nothing wastes more time than discovering the zone was inactive at
minute six.

**Practical tips:**

- Close Slack, WhatsApp, email - notifications will appear on screen
- Record at 1080p; smaller text is unreadable after compression
- If a take goes wrong, stop and restart rather than trying to talk over it

---

## 0:00 - 0:40 | Introduction and problem statement

> "Assalam-o-alaikum. This is YELO, an AI-assisted littering detection system,
> our semester project for CS-551 Artificial Intelligence at the Department of
> Computer Science, University of Karachi, submitted to Sir Rana Zaeem Tariq.
> I am Muhammad Ali, presenting on behalf of our group.
>
> The problem we set out to solve is enforcement. Littering in residential
> societies is difficult to police - guards cannot watch every corner, and CCTV
> is only reviewed after somebody complains, by which time the person
> responsible is long gone. Recording every camera continuously is also
> expensive to store and raises real privacy concerns.
>
> So our system is event-driven. Nothing is recorded continuously. Frames are
> analysed in memory, and only when the system is confident that littering
> occurred does it save evidence - one photo and a short clip. Everything else
> is discarded.
>
> The technical problem is therefore not just detecting trash in a photo. It is
> deciding *when* a littering event has occurred, with few enough false alarms
> that a human reviewer will actually trust the system."

**On screen:** README top, scrolling slowly through sections 1 and 2.

---

## 0:40 - 1:40 | Dataset

**Switch to README section 4.**

> "For training data we used TACO - Trash Annotations in Context - a well-known
> academic litter dataset, which we took from Roboflow Universe in YOLOv8
> format. Version 16, about 3,600 images across train, validation and test
> splits.
>
> We chose TACO deliberately. The important property is that litter is
> photographed *in context* - on pavements, in grass, in gutters, on sand -
> rather than as isolated objects on a white background. A model trained on
> catalogue-style product photos falls apart outdoors. TACO also matches our
> camera viewpoint, looking down at ground level, and it deliberately includes
> hard backgrounds like dry leaves, gravel and wet stone. Those are exactly the
> textures that cause false positives, so training on them teaches the model to
> reject them.
>
> One decision worth explaining: the published dataset has fine-grained
> categories - plastic bottle, cigarette, can, wrapper. We merged all of them
> into a single class called `trash`. The application never needs the sub-type;
> an incident report says littering occurred, not what brand of bottle it was.
> Merging also gave us far more examples per class, which matters when you are
> training for 50 epochs on a free GPU."

**On screen:** the dataset table, then scroll to "Why a single trash class".

---

## 1:40 - 3:00 | Model and training

**Switch to the notebook (tab 2).**

> "For the model we used YOLOv8-small, fine-tuned with transfer learning.
>
> Why YOLO? Because we need localisation - where in the frame - not just
> classification. YOLO is single-stage, so one forward pass gives us every box,
> which suits video far better than a two-stage detector like Faster R-CNN.
>
> Why transfer learning rather than training from scratch? The COCO-pretrained
> backbone already understands edges, textures and object-like shapes. We start
> from those weights and fine-tune for litter, which needs far less data and
> time. Training from random initialisation would need a much bigger dataset
> than a free Colab session allows.
>
> We also applied data augmentation, which is the feature-engineering step for
> images. Each epoch the training photos are varied - hue and brightness shifts,
> small rotations, translation, scaling, horizontal flips, mosaic, random
> erasing. Every one of those maps to a real camera condition: different
> lighting, a camera that is not perfectly level, litter appearing anywhere in
> frame, partial occlusion.
>
> Training ran for 50 epochs at 640 pixels, batch size 16, on Colab's free T4
> GPU. This is the actual notebook, with the outputs preserved."

**On screen:** scroll through the training cell, then the results plots.

> "You can see all the losses decreasing smoothly, with no divergence between
> training and validation - so no overfitting. Precision, recall and mAP all
> rise and start to flatten around epoch 40 to 45, which confirms 50 epochs was
> a sensible place to stop."

---

## 3:00 - 4:00 | Results

**Stay on the notebook, or switch to README section 7.**

> "Our final numbers: mAP at 0.5 is 0.513, mAP at 0.5 to 0.95 is 0.366,
> precision is 0.713, recall is 0.436.
>
> I want to be honest about what these mean rather than just quoting the good
> one. Precision of 0.71 means that when the model says trash, it is right about
> 71 percent of the time. Recall of 0.44 means it finds fewer than half of all
> litter instances - that is genuinely our weak point, and it is because much of
> TACO is small, occluded or camouflaged against leaves and gravel.
>
> But low recall is acceptable in this application, and here is why. A missed
> piece of litter in one frame is not a missed event - the system sees the same
> scene many times per second, and our event rule requires the object to persist
> for several seconds anyway. A false alarm, by contrast, wastes a reviewer's
> time and destroys trust in the system. So we deliberately favour precision."

**On screen:** the metrics table, then the confusion matrix.

> "The confusion matrix also shows a large background false-positive count. In
> object detection every proposed box that does not match an annotation counts
> as a background false positive, so this is dominated by low-confidence
> proposals. What it tells us is that the model is eager to propose trash -
> which is exactly why we do not alert on raw detections."

---

## 4:00 - 5:30 | Code overview

**Switch to `server.py` (tab 3).**

> "This is the inference gateway - the brain of the system. It is plain Python
> using the standard library's HTTP server, with two endpoints: a health check,
> and one that receives frames.
>
> Here is what happens to a single frame.
>
> The phone posts one JPEG about once a second. We validate the camera's secret
> token, then YOLO answers what is in the frame - boxes, labels, confidences.
>
> Then ByteTrack assigns each object a persistent ID. This is the part that
> separates us from a plain object detector. Detection is forgetful - each frame
> is a fresh look, so a bottle in frame one and the same bottle in frame two are
> unrelated as far as YOLO knows. Tracking gives us memory, so we can ask
> questions like: has this object moved, and how long has it been there?
>
> One detail I like: for the zone test we use the *bottom-centre* of the box,
> where the object touches the ground - not the box centre. A standing person's
> midpoint is around their waist, which can fall outside a floor polygon they
> are clearly standing in."

**Scroll to `evaluate_littering_events`.**

> "And this is the actual decision. Five conditions, all required: confidence
> above threshold, inside a restricted zone, a person tracked nearby recently,
> the object has stopped moving, and it stays still for the confirmation delay.
>
> The value of each is clearest in what it rejects. A bottle sitting in a bin -
> no person nearby, so no alert. Somebody carrying a bottle across the zone -
> it keeps moving, so the timer resets every frame, no alert. A single-frame
> false detection - gone next frame, no alert. Somebody drops a bottle and walks
> away - person was near, object is now stationary, timer completes, alert.
>
> So the algorithm is not 'detect trash'. It is detect the transition from
> carried to dropped, near a person, inside a monitored area. That rule is our
> own design, and it is the reason a model with 44 percent recall is still
> usable in practice."

---

## 5:30 - 7:15 | Live execution

**Switch to the terminal (tab 6), then the capture page (tab 5).**

> "Now let me show it running. The gateway is up - you can see it loaded our
> custom model, `yolo_garbage.pt`, on CPU."

**Point at the `YOLO model ready` line, then switch to the phone/capture view.**

> "This is the camera client. I will start the camera now."

**Start the camera. Wait for the Processor tile to show Receiving.**

> "The processor tile shows Receiving, and the frame counter is going up - so
> frames are reaching the gateway and coming back with detections. The blue
> outline here is the restricted zone we drew for this camera."

**Walk into frame holding the litter.**

> "It is detecting me as a person, and the object I am holding. Note that no
> event has started - the object is moving with me, so the stationary condition
> fails."

**Place the litter inside the zone. Step back.**

> "Now I have dropped it inside the zone and stepped away. The object is
> stationary, and a person - me - was tracked nearby a moment ago. The
> confirmation timer is now running."

**Wait for confirmation. Switch to the incidents page (tab 4).**

> "And there is the incident, with a realtime notification. Opening it shows the
> camera, the zone, the detected class, the confidence score, the timestamp, and
> the evidence photo. There is also a before-and-after video clip, built from
> frames the gateway kept in memory - sixty seconds either side of the event.
>
> A reviewer can then confirm this, mark it a false alarm, or resolve it. That
> human-in-the-loop step is deliberate: the system flags possible incidents, it
> does not accuse anybody automatically."

**If the event does not fire within ~20 seconds:** say so plainly - "the
confirmation delay is still running, let me give it a moment" - and wait. Do not
panic or restart. If it genuinely fails, carry on and mention it in the
conclusion; an honest note beats a suspicious cut.

---

## 7:15 - 8:00 | Conclusions

> "To summarise.
>
> We built a working littering detection system. We trained our own YOLOv8 model
> on the TACO dataset using transfer learning and data augmentation, reaching
> mAP at 0.5 of 0.513 with precision of 0.71. We combined it with ByteTrack for
> object identity over time, and wrote a five-condition event rule that decides
> whether littering actually occurred rather than simply whether trash is
> visible.
>
> Our honest limitations: recall is 0.44, so small or occluded litter is missed
> in individual frames. The person-association rule is proximity-based rather
> than pose-based, so in a crowd it could attribute an event to the wrong
> person. And inference runs on a laptop CPU at around thirteen frames per
> second - we evaluated deploying to AWS but free-tier instances did not have
> enough memory for our frame buffer, so we use a tunnel to expose the local
> gateway instead.
>
> For future work we would train longer to raise recall, add pose estimation to
> detect the throwing motion directly, and export to ONNX for faster inference.
>
> All the code, the trained model, the dataset link and our AI usage declaration
> are in the submission. Thank you."

---

## Timing checklist

| Section | Target | Running total |
|---|---|---|
| Introduction and problem | 0:40 | 0:40 |
| Dataset | 1:00 | 1:40 |
| Model and training | 1:20 | 3:00 |
| Results | 1:00 | 4:00 |
| Code overview | 1:30 | 5:30 |
| Live execution | 1:45 | 7:15 |
| Conclusions | 0:45 | 8:00 |

If you are running long, the code overview compresses most easily - the five
conditions matter, the bottom-centre detail does not. Never cut the live
execution; it is the part that proves the project works.

## Coverage of the required points

| Required | Covered at |
|---|---|
| Problem statement | 0:00 - 0:40 |
| Dataset | 0:40 - 1:40 |
| Model / algorithm | 1:40 - 3:00 |
| Code overview | 4:00 - 5:30 |
| Live execution | 5:30 - 7:15 |
| Results and conclusions | 3:00 - 4:00 and 7:15 - 8:00 |
