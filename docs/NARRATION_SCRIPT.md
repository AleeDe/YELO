# Narration Script (Teleprompter Version)

**Read this aloud. Nothing here is a stage direction - every word is spoken.**

Paste each clip into a teleprompter ([teleprompter.com](https://teleprompter.com)
or [cueprompter.com](https://cueprompter.com)) and read at a natural pace.

Total spoken time: approximately **9 minutes 30 seconds** at a natural pace
(145 words per minute). This fits the 5-10 minute requirement with a little
room to spare. If you speak quickly it will come in nearer 8 minutes.

---

## How to use this with AI-generated visuals

The approach: **AI generates the slides, you provide the voice.**

1. Generate visuals for clips 1-4 and 7 using the prompts in
   `docs/VISUAL_PROMPTS.md`.
2. Record your voice reading each clip (Zoom, or any voice recorder).
3. Record clips 5 and 6 yourself - those are your real code and live demo, and
   cannot be generated.
4. Combine: visual on screen, your voice over the top.

**This must be declared.** See the note at the end of this file.

---

## CLIP 1 - Introduction and problem (~70 seconds)

Assalam-o-alaikum.

This is YELO, an AI-assisted littering detection system. It is our semester
project for CS-551 Artificial Intelligence, at the Department of Computer
Science, University of Karachi, submitted to Sir Rana Zaeem Tariq.

I am Muhammad Ali, presenting on behalf of our group.

The problem we set out to solve is enforcement. Littering in residential
societies is very difficult to police. Guards cannot watch every corner, and
CCTV footage is normally reviewed only after somebody complains - by which time
the person responsible is long gone.

Recording every camera continuously is also expensive to store, and it raises
real privacy concerns for residents.

So our system is event-driven. Nothing is recorded continuously. Frames are
analysed in memory, and only when the system is confident that littering has
occurred does it save any evidence.

That means the technical problem is not simply detecting trash in a photograph.
It is deciding when a littering event has occurred, with few enough false alarms
that a human reviewer will actually trust the system.

---

## CLIP 2 - Dataset (~95 seconds)

For training data we used TACO - Trash Annotations in Context. It is a
well-known academic litter dataset, which we obtained from Roboflow Universe in
YOLOv8 format. Version sixteen, containing roughly three thousand six hundred
images across training, validation and test splits.

We chose TACO deliberately, for four reasons.

First, and most importantly, litter is photographed in context - on pavements,
in grass, in gutters, on sand. A model trained on catalogue-style product photos
falls apart outdoors, because it learns the clean background rather than the
object.

Second, the viewpoint matches ours. Most TACO images look down at ground level
from about human height, which is exactly how a society camera sees a footpath.

Third, it deliberately includes hard backgrounds - dry leaves, gravel, wet
stone, shadow. Those are precisely the textures that cause false positives, so
training on them teaches the model to reject them.

Fourth, it is properly annotated and openly licensed under Creative Commons,
which makes our work reproducible.

One decision worth explaining: the published dataset has fine-grained categories
like plastic bottle, cigarette, and wrapper. We merged all of them into a single
class called trash. The application never needs the sub-type - an incident report
says littering occurred, not what brand of bottle it was. Merging also gave us
far more examples per class, which matters when training on a free GPU.

---

## CLIP 3 - Model and training (~85 seconds)

For the model we used YOLOv8-small, fine-tuned using transfer learning.

Why YOLO? Because we need localisation - where in the frame - not just
classification. YOLO is single-stage, so one forward pass gives us every
bounding box. That suits continuous video far better than a two-stage detector
like Faster R-CNN, which is more accurate but far too slow for our purposes.

Why transfer learning rather than training from scratch? The COCO-pretrained
backbone already understands edges, textures and object-like shapes. We start
from those weights and fine-tune for litter, which needs far less data and time.
Training from random initialisation would require a much larger dataset than a
free Colab session allows.

We also applied data augmentation, which is the feature-engineering step for
image models. At each epoch the training photos are varied - hue and brightness
shifts, small rotations, translation, scaling, horizontal flips, mosaic
composition, and random erasing.

Every one of those corresponds to a real camera condition. Brightness shifts
model different lighting. Rotation models a camera that is not perfectly level.
Translation models litter appearing anywhere in frame. Random erasing models
partial occlusion.

Training ran for fifty epochs at six hundred and forty pixels, with a batch size
of sixteen, on Google Colab's free T4 GPU.

---

## CLIP 4 - Results (~95 seconds)

Our final validation numbers are as follows.

Mean average precision at an IoU threshold of zero point five is zero point five
one three. At the stricter zero point five to zero point nine five range, it is
zero point three six six. Precision is zero point seven one three, and recall is
zero point four three six.

I want to be honest about what these mean, rather than quoting only the
favourable one.

Precision of zero point seven one means that when the model says trash, it is
correct about seventy-one percent of the time.

Recall of zero point four four means it finds fewer than half of all litter
instances. That is genuinely our weak point, and it is because much of TACO is
small, occluded, or camouflaged against leaves and gravel.

But low recall is acceptable in this specific application, and the reason is
important. A missed detection in one frame is not a missed event. Our system
observes the same scene many times per second, and the event rule requires the
object to persist for several seconds anyway.

A false alarm, by contrast, goes straight to a human reviewer, wastes their
time, and destroys trust in the system. So we deliberately favour precision.

The training curves also show all losses decreasing smoothly, with no divergence
between training and validation - meaning no overfitting occurred.

---

## CLIP 5 - Code overview (~2 minutes 25 seconds)

**Record this yourself, showing your actual code on screen.**

This is the inference gateway - the brain of the system. It is plain Python,
using only the standard library's HTTP server, with two endpoints: one health
check, and one that receives frames.

Let me walk through what happens to a single frame.

The phone posts one JPEG image roughly once per second. We validate the camera's
secret token, and then YOLO tells us what is in the frame - boxes, labels, and
confidence scores.

Then ByteTrack assigns each object a persistent identity. This is the part that
separates our system from a plain object detector. Detection is forgetful - each
frame is a fresh look, so a bottle in frame one and the same bottle in frame two
are completely unrelated as far as YOLO is concerned. Tracking gives us memory,
so we can ask questions like: has this object moved, and how long has it been
sitting there?

One detail I particularly like: for the zone test we use the bottom-centre of
the bounding box, where the object touches the ground - not the box centre. A
standing person's midpoint is around their waist, which can fall outside a floor
polygon that they are clearly standing inside.

And this function is the actual decision. Five conditions, all required.
Confidence above threshold. Inside a restricted zone. A person tracked nearby
recently. The object has stopped moving. And it stays still for the confirmation
delay.

The value of each condition is clearest in what it rejects. A bottle sitting in
a bin - no person nearby, so no alert. Someone carrying a bottle across the zone
- it keeps moving, so the timer resets every frame, no alert. A single-frame
false detection - gone by the next frame, no alert. Someone drops a bottle and
walks away - a person was near, the object is now stationary, the timer
completes, and we raise an alert.

So the algorithm is not "detect trash". It is detect the transition from carried
to dropped, near a person, inside a monitored area. That rule is our own design,
and it is the reason a model with forty-four percent recall is still usable in
practice.

---

## CLIP 6 - Live demonstration (~110 seconds)

**Record this yourself. This is the section that proves the project works and
it cannot be generated.**

Now let me show the system actually running.

The gateway is up, and you can see in the terminal that it has loaded our custom
model, yolo_garbage dot pt, running on CPU.

This is the camera client. I am starting the camera now.

The processor tile shows "Receiving", and the frame counter is increasing - so
frames are reaching the gateway and coming back with detections. The blue
outline you can see is the restricted zone we drew for this camera.

I am now walking into frame holding a piece of litter.

You can see it is detecting me as a person, and detecting the object I am
holding. Note that no event has started yet - the object is moving with me, so
the stationary condition fails.

Now I have placed it inside the zone, and stepped away.

The object is stationary, and a person - me - was tracked nearby a moment ago.
The confirmation timer is now running.

And there is the incident, with a realtime notification.

Opening it shows the camera, the zone, the detected class, the confidence score,
the timestamp, and the evidence photograph. There is also a before-and-after
video clip, constructed from frames the gateway kept in memory - sixty seconds
either side of the event.

A reviewer can then confirm this incident, mark it as a false alarm, or resolve
it. That human-in-the-loop step is deliberate. The system flags possible
incidents for review. It does not accuse anybody automatically.

---

## CLIP 7 - Conclusion (~2 minutes)

To summarise.

We built a working littering detection system. We trained our own YOLOv8 model
on the TACO dataset using transfer learning and data augmentation, reaching mean
average precision at zero point five of zero point five one three, with
precision of zero point seven one.

We combined that with ByteTrack for object identity over time, and designed a
five-condition event rule that determines whether littering actually occurred,
rather than simply whether trash is visible.

Our main finding is that the temporal decision layer, not detector accuracy
alone, is what makes the system usable.

Our honest limitations: recall is zero point four four, so small or occluded
litter is missed in individual frames. The person-association rule is
proximity-based rather than pose-based, so in a crowd it could attribute an
event to the wrong person. And inference runs on a laptop CPU at around thirteen
frames per second.

For future work, we would train longer to improve recall, add pose estimation to
detect the throwing motion directly, and export the model to ONNX for faster
inference.

All the code, the trained model, the dataset link, our project report and our AI
usage declaration are included in the submission.

Thank you for watching.

---

## Timing summary

Measured at 145 words per minute, which is a natural presenting pace.

| Clip | Content | Duration | Who makes the visual |
|---|---|---|---|
| 1 | Introduction and problem | 1:10 | AI-generated slides |
| 2 | Dataset | 1:35 | AI-generated slides |
| 3 | Model and training | 1:25 | AI-generated slides |
| 4 | Results | 1:35 | AI-generated slides |
| 5 | Code overview | 2:25 | **You - screen recording** |
| 6 | Live demonstration | 1:50 | **You - screen recording** |
| 7 | Conclusion | 2:00 | AI-generated slides |
| | **Total** | **~9:30** | |

This fits the 5-10 minute requirement. If you need to trim:

- **Clip 3** - shorten the augmentation explanation to one sentence (saves ~20 s)
- **Clip 5** - the bottom-centre detail can be cut; the five conditions cannot
- **Clip 7** - the future-work list can drop to two items (saves ~20 s)

Never trim clip 6. The live demonstration is what proves the project works.

---

## Required declaration

If you use AI-generated visuals, this **must** be disclosed. Add the following
to `AI_USAGE_DECLARATION.md` before submitting:

> **Demonstration video.** The explanatory slides and background visuals in
> sections 1, 2, 3, 4 and 7 of our demonstration video were generated using
> [name the tool]. All narration is our own voice, and the code walkthrough and
> live execution sections were recorded directly from our own machine without AI
> assistance.

Disclosed AI use is permitted. Undisclosed AI use is what the course treats as
academic misconduct.
