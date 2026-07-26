# YELO - AI-Assisted Littering Detection and Incident Review Platform

A multi-society, multi-camera system that watches restricted areas, detects when
somebody drops litter, and raises a reviewable incident with photo and video
evidence.

> **CS-551 Artificial Intelligence** - Semester Project
> Department of Computer Science, University of Karachi (BSCS)
> Instructor: Sir Rana Zaeem Tariq
>
> **Group:** Muhammad Ali (B23110006087, Team Lead), Muneeb Roshan
> (B23110006125), Abdur Rahman (B23110006005), Arhum Farooq (B23110006017),
> Sami Ullah (B23110006146)
>
> Full report: [`PROJECT_REPORT.md`](PROJECT_REPORT.md) |
> AI declaration: [`AI_USAGE_DECLARATION.md`](AI_USAGE_DECLARATION.md)
>
> Repository: https://github.com/AleeDe/YELO

---

## Table of Contents

1. [Objective](#1-objective)
2. [Problem Statement](#2-problem-statement)
3. [System Architecture](#3-system-architecture)
4. [Dataset](#4-dataset)
5. [Model and Algorithm](#5-model-and-algorithm)
6. [Training Procedure](#6-training-procedure)
7. [Results](#7-results)
8. [Choosing a Model - Pretrained vs Custom](#8-choosing-a-model---pretrained-vs-custom)
9. [Installation](#9-installation)
10. [Required Libraries](#10-required-libraries)
11. [How to Run - Two Options](#11-how-to-run---two-options)
12. [Expected Output](#12-expected-output)
13. [Configuration Reference](#13-configuration-reference)
14. [Repository Layout](#14-repository-layout)
15. [Limitations and Future Work](#15-limitations-and-future-work)

---

## 1. Objective

Build a working system that:

- accepts live camera frames from phones and webcams,
- detects litter and people using a YOLO object-detection model,
- tracks each object across frames so the same bottle is not counted twice,
- decides - from motion and position - whether a littering event actually
  happened inside a restricted zone,
- stores photo and short video evidence and notifies the society's members.

The academic goal is the detection and decision pipeline. The surrounding web
and mobile application exists so the model can be demonstrated end to end on
real camera input rather than on a folder of test images.

## 2. Problem Statement

Littering in residential societies is difficult to enforce. Guards cannot watch
every corner, and CCTV recordings are only reviewed *after* a complaint, by
which time the person responsible is unidentifiable. Continuous recording of
every camera is also expensive to store and raises privacy concerns.

YELO addresses this with **event-driven detection**. Nothing is recorded
continuously. Frames are analysed in memory, and only when the system is
reasonably confident that a littering event occurred does it save evidence:
one JPEG plus a short before/after clip. Everything else is discarded.

The technical problem is therefore not just "detect trash in a photo". It is:

> Given a stream of frames, decide *when* a littering event has occurred,
> with few enough false alarms that a human reviewer will trust the system.

## 3. System Architecture

```
  Phone / Webcam Capture client
            |
            |  sampled JPEG frames (HTTP POST /frames)
            v
  Python Inference Gateway  (services/inference/server.py)
     - YOLO detection        -> boxes, labels, confidence
     - ByteTrack tracking    -> stable per-object IDs
     - restricted-zone test  -> is the object inside the polygon?
     - event rule            -> was this actually littering?
            |
            |  only on a confirmed event
            v
  Supabase Edge Functions -> Postgres + private storage + realtime alerts
            |
            v
  Next.js Dashboard (apps/dashboard) - review incidents, watch evidence clips
```

Three parts matter for this assignment:

| Part | Where | Role |
|---|---|---|
| **Model** | `yolo_garbage.pt` | Detects litter |
| **Inference gateway** | `services/inference/server.py` | Detection + tracking + event logic |
| **Dashboard** | `apps/dashboard` | Human review of incidents |

### What the inference gateway does

[`services/inference/server.py`](services/inference/server.py) is the brain of
the project. The camera app sends it pictures; it replies with what it sees,
and occasionally with "someone just littered, here is the proof."

It is plain Python using `http.server` from the standard library - no web
framework - and exposes only two routes:

| Route | Method | Purpose |
|---|---|---|
| `/health` | GET | Is the model loaded, which one, what settings |
| `/frames` | POST | Receive one JPEG, return detections |

Here is what happens to a single frame, in order.

**1. A frame arrives.** The phone posts one JPEG roughly once per second. The
gateway first validates the camera's secret token against Supabase. No valid
token, no processing.

**2. It looks at the picture.** YOLO (`models/yolo_garbage.pt`) answers *what is
in this frame and where*, returning boxes such as `trash at 82% here`,
`person at 91% there`. Anything below the confidence threshold is discarded
immediately.

**3. It gives each object a name tag.** This is what separates the system from a
plain object detector. Detection is forgetful - each frame is a fresh look, so
a bottle in frame 1 and the same bottle in frame 2 are, as far as YOLO knows,
unrelated. **ByteTrack** assigns a persistent ID: this bottle is `track 7` and
stays `track 7` across frames. Only then can the gateway ask questions that
require memory - *has track 7 moved? how long has it been there?* Without
tracking, none of the littering logic is possible.

**4. It checks the floor, not the middle.** For each object the gateway takes
the **bottom-centre** of the box - where the object meets the ground - and tests
whether that point falls inside a restricted-zone polygon. Using the box centre
would be wrong: a standing person's midpoint is around their waist, which can
fall outside a floor polygon they are plainly standing in.

**5. It decides whether this is actually littering.** See the rule below.

**6. It saves evidence, but only on confirmation.** The gateway uploads the
evidence photo, builds a before/after video clip from frames held in memory,
inserts the incident record, sends a realtime notification to the dashboard,
and starts a cooldown. Uploads run on background threads so a slow network
never stalls the camera feed.

**7. It forgets everything else.** Frames that do not produce an incident are
discarded. Nothing is written to disk and there is no continuous recording. The
system only retains footage of moments it believes were violations.

### The event rule (the actual "AI decision")

Object detection alone is not enough. A bottle sitting in a bin is not
littering. The gateway confirms an event only when **all five** of these hold:

| # | Condition | Purpose |
|---|---|---|
| 1 | Detection confidence above threshold | Filter obvious noise |
| 2 | Object is inside an active restricted zone | Only monitored areas matter |
| 3 | **A person was tracked nearby recently** (within `YELO_EVENT_PERSON_DISTANCE`, default `0.75`) | Rubbish does not appear on its own |
| 4 | **The object stops moving** (less than `YELO_EVENT_STATIONARY_DISTANCE`, default `0.015`) | Being carried is not being dropped |
| 5 | It stays still for the camera's **confirmation delay** (`confirmation_seconds`, per-camera database setting, default 5 s) | Not a one-frame glitch |

A confirmed track then enters a **120-second cooldown**, so the same item cannot
raise repeated alerts.

The value of each condition is clearest in what it rejects:

| Scenario | Outcome | Blocked by |
|---|---|---|
| A bottle sitting in a bin, nobody near it | No alert | Condition 3 |
| Somebody carrying a bottle across the zone | No alert - the timer resets every frame it moves | Condition 4 |
| A single-frame false detection | No alert | Condition 5 |
| Somebody drops a bottle and walks away | **Alert** | - |

So the algorithm is not "detect trash". It is *detect the transition from
carried to dropped, near a person, inside a monitored area.*

### Where the AI actually is

Two layers, and both are worth naming:

1. **The model** - YOLOv8s fine-tuned on TACO. Answers *what is in this frame?*
   This is transfer learning on a public dataset.
2. **The event logic** - the five-condition rule above. Answers *did littering
   happen?* This is our own design and the original contribution of the project.

The second layer is also why a model with 44% recall remains usable: the gateway
sees the same scene many times per second, so it does not need to catch the
litter in every frame, only often enough during the confirmation window.

## 4. Dataset

### Which dataset and why

We trained on **TACO - Trash Annotations in Context**, obtained from Roboflow
Universe in YOLOv8 format:

| | |
|---|---|
| **Dataset** | `mohamed-traore-2ekkp/taco-trash-annotations-in-context` |
| **Version** | 16 (resize-640, 3x augmented, all-classes release) |
| **Size** | ~3,597 images across train / valid / test splits |
| **Format** | YOLOv8 (`images/`, `labels/`, `data.yaml`) |

The dataset path recorded inside our trained checkpoint confirms this:

```
/content/TACO:-Trash-Annotations-in-Context-Dataset-16/data.yaml
```

The executed training notebook, with all outputs preserved, is
[`docs/colab_train_garbage.ipynb`](docs/colab_train_garbage.ipynb).

We chose TACO over the alternatives for four reasons:

1. **Litter is photographed *in context*, not on a white background.** TACO
   images are of rubbish where it actually lies - on pavements, in grass, in
   gutters, on sand. A model trained on catalogue-style product photos collapses
   outdoors. This is the single most important property for our use case.
2. **It matches our camera viewpoint.** Most images are taken looking down at
   ground level from roughly human height, which is how a society camera sees a
   footpath.
3. **Hard backgrounds are included on purpose** - dry leaves, gravel, wet stone,
   shadows. These are exactly the textures that produce false positives, so
   training on them teaches the model to reject them.
4. **It is properly annotated and openly licensed**, so the work is
   reproducible and the dataset can be submitted alongside the code.

### Why a single `trash` class

Our trained model has exactly one class:

```python
names = {0: 'trash'}
```

This was a deliberate design decision, not a limitation of the data. TACO
carries fine-grained categories (plastic bottle, cigarette, can, wrapper...), but
we merged them all into one `trash` class because:

- **The application never needs the sub-type.** The incident report says
  "littering occurred", not "a 500 ml PET bottle was dropped". Predicting a
  label we discard would waste model capacity.
- **The fine-grained classes are severely imbalanced.** Some categories have
  only a handful of instances, which produces near-zero per-class accuracy and
  a misleading mAP.
- **Merging increases effective examples per class**, which matters a great
  deal when training for 50 epochs on a free GPU.

The trade-off is honest: the system can say *that* litter is present, not
*what kind*. For enforcement, that is sufficient.

### Class imbalance - an important caveat

Our confusion matrix shows the scale of the background problem:

| | True `trash` | True `background` |
|---|---|---|
| **Predicted `trash`** | 826 | 32,620 |
| **Predicted `background`** | 188 | - |

The 32,620 figure is not 32,620 misclassified photographs. In object detection,
every proposed box that does not match a ground-truth annotation counts as a
background false positive, so this number is dominated by low-confidence
proposals. It nonetheless shows the real characteristic of the model: **it is
eager to propose trash**. That is precisely why the gateway applies a
confidence threshold *and* the multi-condition event rule above, instead of
alerting on every raw detection.

### Getting the dataset

The dataset is roughly 1-2 GB, so it is not committed to this repository. It is
provided in two ways.

**1. Direct download (submitted with this project)**

> https://drive.google.com/drive/folders/1ZILumZ_xvB2R9ih7rlQ7W8XpK_qKB6Nb?usp=sharing

That folder contains `TACO_v16_yolov8.zip` (the complete dataset), `data.yaml`,
and a `README.txt` describing the contents and licence.

**2. Fetch it from the original source**

```python
from roboflow import Roboflow

rf = Roboflow(api_key="YOUR_ROBOFLOW_API_KEY")
project = rf.workspace("mohamed-traore-2ekkp").project("taco-trash-annotations-in-context")
dataset = project.version(16).download("yolov8")
```

Full details, including the label format, are in [`DATASET.md`](DATASET.md).

### Licence and attribution

TACO is released under **CC BY 4.0**, which permits redistribution with
attribution.

> Proenca, P. F. and Simoes, P. (2020). *TACO: Trash Annotations in Context for
> Litter Detection.* arXiv:2003.06975. http://tacodataset.org/

We redistribute it unmodified apart from the class merge described above.

## 5. Model and Algorithm

### Detection - YOLOv8s

- **Architecture:** YOLOv8s (small), 11.14 M parameters
- **Base weights:** `yolov8s.pt`, pretrained on COCO
- **Method:** transfer learning / fine-tuning

**Why YOLO?** Littering detection needs *localisation* (where in the frame),
not just classification. YOLO is single-stage: one forward pass yields all
boxes, which suits real-time video far better than two-stage detectors such as
Faster R-CNN.

**Why the `s` variant?** Measured on our own hardware (see §8), `s` sits at the
knee of the accuracy/speed curve - roughly twice the cost of `n` for a clear
accuracy gain, while `m` is over five times slower for a smaller improvement.

**Why transfer learning rather than training from scratch?** The COCO-pretrained
backbone already knows edges, textures and object-like shapes. Fine-tuning
adapts that to litter using far less data and time. Training YOLOv8s from
random initialisation would need a much larger dataset and many more epochs than
a free Colab session allows.

### Tracking - ByteTrack

Detection is per-frame and stateless. To reason about *events* we need object
identity over time, so the gateway runs **ByteTrack** (`bytetrack.yaml`) to
assign a persistent ID to each object. Tracking state is kept **separately per
camera**, and stale tracks are pruned after `YELO_TRACKER_STALE_SECONDS`.

Tracking is what makes conditions 2, 3 and 5 of the event rule possible: without
stable IDs there is no notion of "the same bottle stayed still for 12 seconds".

## 6. Training Procedure

Training was done in **Google Colab on a free T4 GPU**. The laptop used for
development has no CUDA GPU, so CPU training was not practical.

The exact hyperparameters recorded in the checkpoint:

```python
from ultralytics import YOLO

model = YOLO("yolov8s.pt")        # COCO-pretrained starting point

model.train(
    data   = f"{dataset.location}/data.yaml",
    epochs = 50,
    imgsz  = 640,
    batch  = 16,
    patience = 15,                # early stop if no improvement
    optimizer = "auto",
    lr0    = 0.01,
    project = "yelo_garbage",
    name    = "run1",
)
```

| Setting | Value | Reason |
|---|---|---|
| `epochs` | 50 | Curves had flattened by ~45; more risked overfitting for little gain |
| `imgsz` | 640 | YOLO default; litter is small, and dropping lower loses it |
| `batch` | 16 | Largest that fits comfortably in T4 memory at 640 px |
| `patience` | 15 | Stops early if 15 epochs bring no improvement |
| `optimizer` | auto | Ultralytics selects and schedules the optimiser |
| `lr0` | 0.01 | Ultralytics default; not tuned further |

### Data augmentation (feature engineering)

For image models, feature engineering means synthetically varying the training
photos each epoch, so the network learns the *object* rather than exact pixels.
This fights over-fitting and mirrors real camera conditions:

| Augmentation | Effect | Real-world reason |
|---|---|---|
| `hsv_h` / `hsv_s` / `hsv_v` | Shifts hue, saturation, brightness | Different cameras, lighting, day vs shade |
| `degrees` | Small rotations | Camera is not perfectly level |
| `translate` | Shifts the image | Litter can appear anywhere in frame |
| `scale` | Zooms in and out | Near vs far litter |
| `fliplr` | Horizontal flip | Litter has no fixed orientation |
| `mosaic` | Stitches 4 images into 1 | More objects and context per step |
| `erasing` | Randomly erases patches | Robustness to partial occlusion |

Training ran the full 50 epochs (early stopping did not trigger), producing
`best.pt`, which we renamed to **`models/yolo_garbage.pt`**.

- Checkpoint date: **2026-07-24**
- Ultralytics version used for training: **8.4.104**

The training notebook is [`docs/colab_train_garbage.ipynb`](docs/colab_train_garbage.ipynb)
and the full plan is in [`docs/COLAB_TRAINING_PLAN.md`](docs/COLAB_TRAINING_PLAN.md).

## 7. Results

Final validation metrics, read directly from the trained checkpoint:

| Metric | Value |
|---|---|
| **mAP@0.5** | **0.513** |
| **mAP@0.5:0.95** | **0.366** |
| **Precision** | **0.713** |
| **Recall** | **0.436** |
| val box loss | 1.044 |
| val cls loss | 1.157 |
| val dfl loss | 1.090 |

### Reading these numbers honestly

- **Precision 0.71** - when the model says "trash", it is right about 71 % of
  the time. Good enough that a human reviewer is not flooded with nonsense.
- **Recall 0.44** - it finds fewer than half of all litter instances. This is
  the weak point. Much of TACO is small, partially occluded, or camouflaged
  against leaves and gravel.
- **mAP@0.5 = 0.51** - respectable for a single-class detector fine-tuned for
  50 epochs on a free GPU, and comparable to published TACO baselines.

**Why low recall is acceptable here.** A missed piece of litter in one frame is
not a missed event: the gateway sees the same scene many times per second, and
the event rule requires an object to persist for several seconds anyway. A
*false* alarm, by contrast, wastes a reviewer's time and erodes trust. The
precision-favouring balance is the right one for this application.

### Training curves

`results.png` shows all losses (train and validation, box/cls/dfl) decreasing
smoothly and monotonically with no divergence between train and validation -
i.e. **no overfitting**. Precision, recall, mAP@0.5 and mAP@0.5:0.95 all rise
steadily and begin to plateau around epoch 40-45, confirming that 50 epochs was
a sensible stopping point.

### Qualitative results

On sample validation images the model correctly boxes a drink can on wet rock at
**0.82** confidence, and cleanly identifies bottles, wrappers, cardboard and
cigarette ends across pavement, grass, sand and leaf-litter backgrounds. Typical
confidences on clear objects are 0.7-1.0; ambiguous ones sit at 0.28-0.5, which
is exactly where the configurable confidence threshold does its work.

## 8. Choosing a Model - Pretrained vs Custom

The gateway can run **any** Ultralytics-compatible `.pt` file. The project ships
five, and understanding the choice is part of the design.

### Measured performance on our development machine

Benchmarked on **AMD Ryzen, 12 cores, 16 GB RAM, CPU-only** (mean of 5 runs
after warm-up):

All weights live in the [`models/`](models/) directory.

| Model | Size | imgsz | Latency | Throughput | Classes |
|---|---|---|---|---|---|
| `yolo26n.pt` | 5.3 MB | 640 | 103 ms | 9.7 FPS | 80 COCO |
| `yolo26s.pt` | 20 MB | 640 | 216 ms | 4.6 FPS | 80 COCO |
| `yolo26m.pt` | 43 MB | 960 | **1166 ms** | 0.9 FPS | 80 COCO |
| `yolo26l.pt` | 51 MB | 960 | not benchmarked (slowest) | - | 80 COCO |
| `yolo_garbage.pt` | 22 MB | 640 | 127 ms | 7.9 FPS | 1 (`trash`) |
| **`yolo_garbage.pt`** | **22 MB** | **480** | **75 ms** | **13.3 FPS** | **1 (`trash`)** |

### Our recommendation

**Use `yolo_garbage.pt` at `imgsz=480`** - the configuration we ship in
`services/inference/.env`. At **75 ms (13.3 FPS)** it is the fastest option in
the table *and* the only one actually trained on litter.

Dropping from 640 to 480 nearly halves the latency. Because the gateway samples
roughly one frame per second rather than processing full-rate video, the small
loss in accuracy on very small objects is a worthwhile trade for the headroom
it gives the tracker.

If a machine is much slower, `yolo26n.pt` at 103 ms is the fallback - but it
detects COCO objects, not litter.

Avoid `yolo26m.pt` and `yolo26l.pt` on CPU. At **1.17 s per frame**, `m`
processes under one frame per second; tracking degrades badly because objects
move too far between frames for ByteTrack to associate reliably.

> Measurements vary with system load. These were taken on an otherwise idle
> machine; expect slower figures while a browser and dev server are running.

### How to use a *pretrained* model instead of ours

If you want to run the generic COCO model rather than our trained one - for
comparison, or if the custom weights are unavailable - set two variables in
`services/inference/.env`:

```ini
YELO_MODEL_PATH=models/yolo26n.pt
YELO_WASTE_CLASSES=bottle,cup,bowl,banana,apple,orange,backpack,handbag,suitcase
```

Both matter. `YELO_MODEL_PATH` selects the weights; `YELO_WASTE_CLASSES` tells
the event logic which of the 80 COCO labels count as "waste". Without the second
line the model will detect bottles but never raise a littering event, because
the rule would not recognise `bottle` as waste.

> **Note on the first run:** if the named weights file is not present locally,
> Ultralytics downloads the public weights automatically. This needs an internet
> connection once; afterwards it runs offline.

To go back to the custom model:

```ini
YELO_MODEL_PATH=models/yolo_garbage.pt
YELO_WASTE_CLASSES=trash
```

`YELO_WASTE_CLASSES=trash` is essential - our model emits only the label
`trash`, so leaving the COCO list in place would mean no event ever fires.

### Why we did both

We deliberately built the system in two stages, and both are worth showing:

1. **Stage 1 - pretrained COCO model.** We got the whole pipeline working
   end to end (capture -> detect -> track -> zones -> events -> dashboard) using
   `yolo26m.pt` off the shelf, treating COCO's `bottle`/`cup` as stand-ins for
   litter. This proved the architecture without waiting on training, but it is
   **not a littering model**: it cannot see wrappers, cigarette ends or
   crumpled paper, and it happily detects a bottle someone is drinking from.
2. **Stage 2 - custom fine-tuned model.** We then trained `yolo_garbage.pt` on
   TACO and swapped it in by changing two configuration lines. Because the
   gateway was written to be model-agnostic, no application code changed at all.

That swap-without-code-change is the payoff of keeping model choice in
configuration.

## 9. Installation

### Prerequisites

| Requirement | Version used | Notes |
|---|---|---|
| Python | 3.14.3 | 3.10+ works |
| Node.js | 24.14.0 | 20+ works |
| npm | bundled | |
| OS | Windows 11 | Also runs on macOS/Linux |

A GPU is **not** required - inference runs on CPU.

### Step 1 - Clone and enter the project

```bash
git clone <repository-url>
cd YELO
```

### Step 2 - Install Python dependencies (inference gateway)

```bash
pip install -r requirements.txt
```

### Step 3 - Install Node dependencies (dashboard)

```bash
cd apps/dashboard
npm install
cd ../..
```

### Step 4 - Configure environment

The inference gateway needs Supabase credentials to validate camera tokens:

```bash
cp services/inference/.env.example services/inference/.env
```

Then edit `services/inference/.env` and set at minimum:

```ini
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
YELO_MODEL_PATH=models/yolo_garbage.pt
YELO_WASTE_CLASSES=trash
YELO_MODEL_IMAGE_SIZE=480
```

> If you are evaluating this submission and do not have Supabase credentials,
> see **Option B** in §11 - we will run the backend for you.

## 10. Required Libraries

### Python (inference gateway)

| Library | Purpose |
|---|---|
| `ultralytics` | YOLO model loading, inference, training |
| `opencv-python-headless` | Image decoding, evidence-clip encoding |
| `lap` | Linear assignment solver required by ByteTrack |
| `torch`, `torchvision` | Deep-learning runtime (installed with ultralytics) |
| `numpy` | Array handling |

Installed via `requirements.txt`. Note that `torch` is a large download
(~2 GB); the first install takes several minutes.

### JavaScript (dashboard)

| Library | Version | Purpose |
|---|---|---|
| `next` | 16.2.7 | React framework |
| `react` | 19.2.4 | UI |
| `@supabase/supabase-js` | ^2.108.0 | Auth, database, realtime, storage |
| `@capacitor/core` | ^8.4.0 | Android packaging |

### Training only (Google Colab)

`ultralytics`, `roboflow` - not needed to *run* the project.

## 11. How to Run - Two Options

The system has a cloud backend (Supabase) that we do not have public hosting
for. There are therefore two ways to run this project, and **Option B requires
no setup on your side**.

---

### Option A - Run it yourself, entirely on localhost

Use this if you have your own Supabase project and want to run everything
locally.

**Terminal 1 - start the inference gateway:**

```powershell
.\services\inference\start.ps1
```

On macOS/Linux, or to set variables manually:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export YELO_MODEL_PATH="models/yolo_garbage.pt"
export YELO_WASTE_CLASSES="trash"
python services/inference/server.py
```

Verify it is up:

```
http://127.0.0.1:8000/health
```

**Terminal 2 - start the dashboard:**

```bash
cd apps/dashboard
npm run dev
```

Open `http://localhost:3000`.

**To use a phone camera on the same Wi-Fi**, point the dashboard at your
laptop's LAN address instead of localhost:

```ini
NEXT_PUBLIC_YELO_INFERENCE_URL=http://192.168.1.3:8000
```

Restart the dev server after changing it. Windows Firewall must allow Python on
private networks.

---

### Option B - We host it for you (recommended for evaluation)

**We do not have a cloud server.** The model runs on our own laptop, exposed
over HTTPS through a reserved **ngrok** tunnel:

```
https://nonexportable-clorinda-overhardy.ngrok-free.dev
```

This address is permanent and is already the default endpoint in the app, but
it is **only live while our laptop is running the gateway**. It is not a hosted
service.

> **Please contact us before testing and we will start the server, confirm the
> tunnel is online, and provide a demo login.**

When you ask, we will:

1. Start the inference gateway (`python services/inference/server.py`).
2. Start the tunnel so the address above resolves.
3. Send you the dashboard link and demo credentials.

Because the tunnel depends on our machine being switched on, please arrange a
time with us. A recorded demonstration of the full system is also included with
this submission if a live session is not convenient.

The tunnel exists because the app is served over HTTPS: a browser will block
a plain `http://<lan-ip>` inference endpoint as mixed content, so an HTTPS
address is required. Full details are in
[`docs/DEMO_RUNBOOK.md`](docs/DEMO_RUNBOOK.md).

---

### Running the model on its own (no backend needed)

To verify just the AI component - no Supabase, no dashboard:

```bash
python -c "from ultralytics import YOLO; YOLO('models/yolo_garbage.pt').predict('your_photo.jpg', save=True, conf=0.25)"
```

The annotated image is written to `runs/detect/predict/`. This is the quickest
way to confirm the trained model works.

## 12. Expected Output

### Gateway health check

`GET http://127.0.0.1:8000/health` returns:

```json
{
  "status": "ready",
  "service": "yelo-inference",
  "modelReady": true,
  "modelName": "yolo_garbage.pt",
  "modelDevice": "cpu",
  "modelError": null,
  "tracker": "bytetrack.yaml",
  "activeTrackers": 0,
  "confidence": 0.2,
  "wasteClasses": ["trash"],
  "eventReportingReady": true
}
```

`"modelReady": true` and `"modelName": "yolo_garbage.pt"` confirm the custom
model loaded. If `modelError` is non-null, the weights path is wrong.

### Per-frame detection response

Each frame POSTed to `/frames` returns normalised boxes, labels, confidences,
stable track IDs, movement trails and inference time.

### On a confirmed littering event

1. The dashboard shows a **realtime notification** within a second or two.
2. A new incident appears with an **evidence JPEG**.
3. A **before/after clip** (60 s each side by default) is attached shortly
   after, playable in the zoomable evidence viewer.
4. The offending track enters a **120 s cooldown**.

### Single-image prediction

An annotated copy in `runs/detect/predict/` with blue boxes labelled
`trash 0.82`, matching the sample results in §7.

### Typical timings on CPU

| Operation | Expected |
|---|---|
| Gateway cold start (model load) | 3-8 s |
| Inference per frame (`yolo_garbage.pt`, 480) | ~75 ms |
| Event confirmation | configurable, default ~12 s |

## 13. Configuration Reference

All settings live in `services/inference/.env`.

### Model

| Variable | Default | Meaning |
|---|---|---|
| `YELO_MODEL_PATH` | `yolo26l.pt` | Weights file - **set to `yolo_garbage.pt`** |
| `YELO_MODEL_DEVICE` | `cpu` | `cpu` or `cuda` |
| `YELO_MODEL_CONFIDENCE` | `0.2` | Minimum detection confidence - **we run 0.30**, see below |
| `YELO_MODEL_IMAGE_SIZE` | `960` | Inference size - **we run 480** (see §8) |
| `YELO_DETECTION_CLASSES` | *(all)* | Optional label filter |

### Tracking

| Variable | Default | Meaning |
|---|---|---|
| `YELO_TRACKER_CONFIG` | `bytetrack.yaml` | Tracker configuration |
| `YELO_TRACKER_STALE_SECONDS` | `120` | Drop idle tracker state |
| `YELO_TRACK_HISTORY_LENGTH` | `20` | Trail points retained |

### Event rule

| Variable | Default | Meaning |
|---|---|---|
| `YELO_WASTE_CLASSES` | COCO list | **Set to `trash`** for the custom model |
| `YELO_EVENT_STATIONARY_DISTANCE` | `0.015` | Max movement to count as "dropped" |
| `YELO_EVENT_PERSON_DISTANCE` | `0.75` | How close a person must have been |
| `YELO_EVENT_PERSON_MEMORY_SECONDS` | `15` | How long a person is remembered |
| `YELO_EVENT_CANDIDATE_GRACE_SECONDS` | `12` | Persistence before confirming - **we run 6**, see below |
| `YELO_EVENT_COOLDOWN_SECONDS` | `120` | Suppress repeats per track |

### Why we set confidence to 0.30

**No single confidence value triggers an alert.** Confidence is only the first
of five conditions; the event rule in section 3 does the rest. That is what
makes 0.30 a reasonable choice rather than a reckless one.

The reasoning:

- **Our recall is the weak side (0.436).** The model misses more than half of
  all litter instances in any single frame. Raising the threshold to, say,
  0.50 would discard detections we cannot spare.
- **The confusion matrix shows heavy low-confidence noise** - 32,620 background
  false positives. Dropping much below 0.30 lets that noise into the event
  logic.
- **Real litter scores 0.4-1.0 in our sample predictions**, with genuine but
  harder items (small, occluded, camouflaged) landing around 0.28-0.50. A
  threshold of 0.30 sits just under that band and above the noise floor.
- **The four remaining conditions do the real filtering.** An object must also
  be inside a restricted zone, stay nearly stationary, have had a person nearby
  recently, and persist past the grace period. Because those conditions are
  strict, we can afford a permissive confidence bar and recover recall we would
  otherwise lose.

In short: we trade a slightly noisier detector for better coverage, and let the
event rule - not the confidence score - decide what counts as littering.

### Where the confirmation delay actually comes from

This trips people up, so it is worth stating plainly.

**The wait before an incident fires is `confirmation_seconds`, a per-camera
column in the database** (default **5 seconds**, range 1-60, editable in the
dashboard's camera settings). It is not an environment variable.

`YELO_EVENT_CANDIDATE_GRACE_SECONDS` does something different: it decides how
long a half-finished candidate survives when the object stops being detected.
Because our recall is 0.436, litter flickers in and out between frames, and
this window is what stops a brief dropout from resetting the timer. We set it
to **6 seconds** - long enough to bridge detection gaps, short enough that an
object genuinely removed from the scene is forgotten quickly.

### Tuning for a live demonstration

If alerts are not firing on camera, lower the confidence bar and shorten the
per-camera confirmation delay in the dashboard:

```ini
YELO_MODEL_CONFIDENCE=0.25
```

If there are too many false alarms:

```ini
YELO_MODEL_CONFIDENCE=0.45
```

### Evidence clips

| Variable | Default | Meaning |
|---|---|---|
| `YELO_CLIP_ENABLED` | `1` | Record before/after clips |
| `YELO_CLIP_PRE_SECONDS` | `60` | Seconds before the event |
| `YELO_CLIP_POST_SECONDS` | `60` | Seconds after |
| `YELO_CLIP_WIDTH` | `640` | Clip width |

> On a low-memory machine set `YELO_CLIP_ENABLED=0` - the frame buffer is the
> largest consumer of RAM.

## 14. Repository Layout

```
YELO/
├── models/
│   ├── yolo_garbage.pt          <- our trained model (22 MB, 1 class)
│   └── yolo26n/s/m/l.pt         <- pretrained COCO models (comparison)
│
├── requirements.txt             <- Python dependencies
├── README.md
├── PROJECT_REPORT.md            <- full project report (print .html to PDF)
├── PROJECT_REPORT.html          <- printable version of the report
├── build_report.py              <- regenerates the .html from the .md
├── build_submission.py          <- builds submission/YELO_Submission.zip
├── assets/uok-logo.png          <- university crest used on the title page
├── DATASET.md                   <- dataset source, download link, licence
├── AI_USAGE_DECLARATION.md      <- declaration of AI tool usage
│
├── services/inference/
│   ├── server.py                <- gateway: detect, track, zones, events
│   ├── requirements.txt
│   ├── start.ps1                <- Windows launcher
│   └── .env.example             <- all configuration options
│
├── apps/dashboard/              <- Next.js + Capacitor client
│
├── supabase/
│   ├── functions/               <- Edge Functions
│   └── migrations/              <- database schema
│
└── docs/
    ├── COLAB_TRAINING_PLAN.md   <- how the model was trained
    ├── colab_train_garbage.ipynb <- runnable training notebook
    ├── DATABASE_DESIGN.md       <- database schema
    ├── DEMO_RUNBOOK.md          <- demonstration steps
    ├── RECORDING_SCRIPT.md      <- timed script for the demo video
    ├── NARRATION_SCRIPT.md      <- teleprompter version (spoken words only)
    ├── VISUAL_PROMPTS.md        <- AI prompts for generating slides
    ├── VEO_PROMPTS.md           <- Gemini/Veo prompts for b-roll footage
    ├── WEEK_01_PROJECT_PLAN.md  <- weekly planning and progress
    ├── WEEK_02_BACKLOG.md
    ├── WEEK_03_BACKLOG.md
    └── WEEK_04_FIELD_TEST.md    <- real-camera field test results
```

## 15. Limitations and Future Work

We would rather state these plainly than overstate the system.

**Current limitations**

1. **Recall is 0.44.** Small, occluded or camouflaged litter is missed. Partly
   mitigated by seeing each scene over many frames.
2. **Single class.** The system reports "litter", not what kind.
3. **CPU inference is ~13 FPS at 480 px.** Adequate for the sampled frames the
   gateway actually processes, but not for full-rate multi-camera video. A CUDA
   GPU would remove this limit.
4. **The person-association rule is proximity-based**, not pose-based. It
   infers "the nearest recently-seen person" rather than observing the act of
   dropping. In a crowd it may attribute an event to the wrong person.
5. **No cloud deployment.** Hence Option B in §11.
6. **Background false positives are high in raw detection**, which is why the
   event rule exists.

**Future work**

- Train longer, with more epochs and augmentation, to raise recall.
- Add pose estimation to detect the throwing motion directly.
- Export to ONNX/TensorRT for faster CPU or edge inference.
- Deploy the gateway to a GPU cloud instance for a permanent public demo.
- Re-introduce fine-grained classes once enough per-class data exists.

## Release Checks

```bash
cd apps/dashboard
npm run lint
npm run typecheck
npm run build
npm run test:field
```

Start `services/inference/start.ps1` before running `test:field`.
