# AI Usage Declaration

**University:** University of Karachi
**Department:** Department of Computer Science
**Program:** Bachelor of Science in Computer Science (BSCS)
**Course:** CS-551 Artificial Intelligence
**Instructor:** Sir Rana Zaeem Tariq

**Project:** YELO - AI-Assisted Littering Detection and Incident Review Platform
**Date:** 26 July 2026

**Group Members**

| Name | Roll Number | Role |
|---|---|---|
| Muhammad Ali (Team Lead) | B23110006087 | Model training and event-detection algorithm design |
| Muneeb Roshan | B23110006125 | Dataset engineering and augmentation strategy |
| Abdur Rahman | B23110006005 | Multi-object tracking and track-identity logic |
| Arhum Farooq | B23110006017 | Model evaluation, benchmarking, threshold tuning |
| Sami Ullah | B23110006146 | Inference pipeline and deployment testing |

---

## 1. AI Tools Used

We declare that the following AI tools were used during this project:

| Tool | Provider | Purpose |
|---|---|---|
| **Claude Code (Claude Opus)** | Anthropic | Coding assistant - debugging, refactoring, documentation |
| **Google Colab** | Google | GPU runtime used to train the model (compute only, not an AI writing tool) |
| **Ultralytics YOLOv8** | Ultralytics | The detection library and pretrained weights our model is built on |
| **[TOOL NAME - fill in]** | - | Generated the explanatory slides used in our demonstration video (narration is our own voice) |

No AI tool was used to write the project's application code beyond the assisted
debugging described below, and no AI-generated voice or presenter appears in our
demonstration video.

> **Note:** if you did not use a slide generator, delete the fourth row above and
> the "Demonstration video" row in section 3, and restore this sentence: "No
> other AI tools (ChatGPT, GitHub Copilot, Gemini, or similar) were used."

---

## 2. How AI Tools Were Used

### Claude Code (Anthropic)

Used as an interactive assistant throughout development, in the following ways:

- **Debugging.** Diagnosing runtime errors and tracing faults. For example, a
  crash in the evidence-clip upload thread caused by an incorrect variable name,
  and an authentication failure when uploading clips to Supabase Storage.
- **Code review and refactoring.** Reviewing our implementation for correctness
  and suggesting improvements, particularly around the tracking and event logic.
- **Explaining concepts and errors.** Understanding YOLO training output,
  interpreting mAP/precision/recall, and understanding ByteTrack's requirements.
- **Documentation.** Drafting the README and this declaration (see §3).
- **Infrastructure exploration.** We investigated deploying the inference
  gateway to AWS EC2 with AI assistance. **This work was abandoned** and no
  cloud deployment forms part of the final submission; the system runs locally.

### Google Colab

Used purely as **compute** - a free T4 GPU to train the model, because no
group member has a CUDA-capable GPU. No AI writing or code-generation feature
of Colab was used.

### Ultralytics YOLOv8

A third-party open-source library, used as the detection framework. Our model
is a fine-tune of the publicly available `yolov8s.pt` COCO checkpoint. This is
standard, cited practice, not undisclosed AI authorship.

---

## 3. Sections Written or Generated With AI Assistance

We disclose specifically:

| Item | Extent of AI involvement |
|---|---|
| **`README.md`** | **Substantially drafted with AI assistance.** We supplied the project facts, training results, dataset choice and hosting constraints; the AI structured and wrote the prose. All technical figures in it were read from our own trained checkpoint and verified by us. |
| **`AI_USAGE_DECLARATION.md`** (this file) | Drafted with AI assistance from our description of how we worked, then reviewed and confirmed accurate by us. |
| **`requirements.txt`** | Generated with AI assistance from our working environment, then verified to install correctly. |
| **`docs/COLAB_TRAINING_PLAN.md`**, **`docs/colab_train_garbage.ipynb`** | Written with AI assistance as a training guide, then executed and adjusted by us. |
| **Bug fixes in `services/inference/server.py`** | Several fixes were identified or suggested with AI assistance; we tested and committed them. |
| **Code comments and commit messages** | Some drafted with AI assistance. |
| **Demonstration video - explanatory slides** | The presentation slides shown during the problem statement, dataset, model, results and conclusion sections were generated with [TOOL NAME - fill in] from content we wrote ourselves. **All narration is our own voice.** The code walkthrough and the live execution sections were screen-recorded directly from our own machine with no AI assistance. |

---

## 4. Work Implemented By Us

The following were decided, carried out, or produced by the group. AI was used
for support in places, as declared above, but the work and the judgement behind
it are ours:

**Project design**
- Choice of problem, scope, and the event-driven (non-continuous-recording)
  approach.
- The overall architecture: capture clients -> inference gateway -> Supabase ->
  dashboard.
- The **littering event rule** - that a confirmed event requires a stationary
  waste object, inside a zone, near a recently-seen person, sustained past a
  grace period, with per-track cooldown. This is the core original contribution
  of the project and was our design.

**Dataset and model**
- Surveying available datasets and selecting **TACO**, for the reasons given in
  README §4.
- The decision to merge all categories into a single `trash` class.
- Choosing YOLOv8s and transfer learning over training from scratch.
- Selecting the hyperparameters (50 epochs, imgsz 640, batch 16, patience 15).
- Running the training, evaluating results, and integrating `yolo_garbage.pt`
  into the gateway.
- Benchmarking the candidate models on our hardware to justify model choice.

**Implementation**
- The application code across 56 commits: the inference gateway, camera pairing
  and token rotation, restricted-zone drawing and evaluation, WebRTC live
  preview, evidence capture and clip generation, the Next.js dashboard, the
  Supabase schema, Edge Functions, and the Capacitor Android build.
- Field testing on real cameras and phones, and the resulting fixes.

**Evaluation**
- Interpreting the metrics and the trade-off between precision and recall, and
  judging that a precision-favouring model suits this application.
- The stated limitations in README §15 reflect our own assessment.

---

## 5. Statement

We confirm that:

1. The AI usage described above is complete and accurate to the best of our
   knowledge.
2. We understand the material we are submitting and can explain any part of it
   on request.
3. Where AI assistance produced text or code, we reviewed it, tested it, and
   take responsibility for its correctness.
4. All third-party components (Ultralytics YOLOv8, the TACO dataset, Next.js,
   Supabase) are open-source and used in accordance with their licences.

---

**Signatures**

| Name | Roll Number | Signature | Date |
|---|---|---|---|
| Muhammad Ali | B23110006087 | _______________ | ___________ |
| Muneeb Roshan | B23110006125 | _______________ | ___________ |
| Abdur Rahman | B23110006005 | _______________ | ___________ |
| Arhum Farooq | B23110006017 | _______________ | ___________ |
| Sami Ullah | B23110006146 | _______________ | ___________ |
