# AI Prompts for Generating Presentation Visuals

Use these with an AI slide or video generator. Record your own voice over the
result using `docs/NARRATION_SCRIPT.md`.

> **Looking for Gemini / Veo video prompts?** They are in
> [`VEO_PROMPTS.md`](VEO_PROMPTS.md). Veo generates cinematic b-roll footage for
> the problem-statement section only; it cannot render your metrics, your
> dashboard, or your code. Use this file for the explanatory slides.

**Clips 5 and 6 are not here.** Those are your real code and your live demo -
they must be screen-recorded from your own machine. No generator can produce
them, and they are the sections that prove the project works.

---

## Which tool to use

| Tool | Output | Cost | Notes |
|---|---|---|---|
| **Gamma** (gamma.app) | Slides, exportable | Free tier | Best balance. Clean, academic, fast. |
| **Canva Magic Design** | Slides + simple motion | Free tier | Good templates, familiar interface |
| **NotebookLM** | Narrated video | Free | Generates its own voice - you would need to mute it and use yours |
| **Google Slides + Gemini** | Slides | Free | Most control, least automated |

**Recommended: Gamma.** Generate slides, export, screen-record while scrolling
through them, and speak over the top. Simple and reliable.

Avoid tools that generate an AI presenter or AI voice - your voice is the part
that demonstrates you understand the work.

---

## Global style instruction

Prefix every prompt with this so the deck stays consistent:

> Style: clean academic presentation for a university computer science project.
> Dark slate background, white text, single green accent colour. Sans-serif
> font. Minimal text per slide - headline plus a few short bullets. No stock
> photos of people. No decorative clip art. Technical and restrained, not
> marketing-style.

---

# THE MASTER PROMPT (use this one)

**Generate the whole deck in a single request, not clip by clip.**

Generating section by section produces inconsistent colours, fonts and layouts
between sections, and the mismatch is obvious once the clips are joined into one
video. One request keeps the design uniform.

Paste everything below into Gamma (or your chosen tool) as a single prompt:

---

> Create a 16-slide academic presentation for a university final-year computer
> science project. This will be screen-recorded with our own voiceover, so the
> slides must carry the visuals only - do not add narration, speaker notes, or
> any AI voice.
>
> **Style:** clean and technical. Dark slate background, white text, one green
> accent colour throughout. Sans-serif font. Minimal text per slide - a headline
> plus at most four short bullets. No stock photos of people, no clip art, no
> marketing language. This is an academic report, not a product pitch.
>
> **Project:** YELO, an AI-assisted littering detection system. It uses a YOLOv8
> object detection model with ByteTrack multi-object tracking to decide when a
> littering event has occurred, rather than simply detecting whether rubbish is
> visible.
>
> Build these 16 slides in this exact order:
>
> **1. Title slide.** "YELO - AI-Assisted Littering Detection". Subtitle:
> "CS-551 Artificial Intelligence, Department of Computer Science, University of
> Karachi". Leave clear space at the top for a university crest to be added
> later.
>
> **2. The Problem.** Four bullets: guards cannot watch every area; CCTV is
> reviewed only after a complaint; continuous recording is expensive to store;
> continuous recording raises privacy concerns.
>
> **3. Our Approach: Event-Driven Detection.** A two-sided contrast. Left:
> "Continuous recording - everything stored". Right: "Event-driven - analysed in
> memory, only incidents saved". Simple divider, no illustration.
>
> **4. Dataset: TACO.** A small table: Source - Roboflow Universe; Version - 16;
> Size - approximately 3,597 images; Format - YOLOv8; Licence - CC BY 4.0.
>
> **5. Why TACO?** Four bullets: litter photographed in real environments, not on
> plain backgrounds; camera viewpoint matches ours; includes difficult
> backgrounds such as leaves, gravel and wet stone; openly licensed and
> reproducible.
>
> **6. Single Class Design.** A diagram: several category names (plastic bottle,
> cigarette, can, wrapper, cardboard) converging with arrows into one box
> labelled "trash". Below, two bullets: the application does not need the
> sub-type; merging increases examples per class. Leave space for a screenshot.
>
> **7. Model: YOLOv8-small.** Four bullets: 11.14 million parameters;
> single-stage detector, one forward pass per frame; pretrained on COCO;
> fine-tuned on TACO.
>
> **8. Why Transfer Learning?** A horizontal flow diagram: "COCO pretrained
> weights" -> "knows edges, shapes, textures" -> "fine-tune on litter" -> "our
> model". Below it, one line: "Less data, less time, better accuracy than
> training from scratch".
>
> **9. Data Augmentation (Feature Engineering).** A two-column table. Left
> "Augmentation", right "Real-world condition". Rows: HSV shift / different
> lighting and cameras; Rotation / camera not level; Translation / litter
> anywhere in frame; Scale / near versus far; Flip / no fixed orientation;
> Mosaic / more context per step; Random erase / partial occlusion.
>
> **10. Training Configuration.** A table: Epochs 50; Image size 640; Batch size
> 16; Patience 15; Optimiser auto; Hardware Google Colab free T4 GPU.
>
> **11. Validation Results.** Four metrics shown as large prominent figures with
> small labels beneath: mAP@0.5 = 0.513; mAP@0.5:0.95 = 0.366; Precision = 0.713;
> Recall = 0.436.
>
> **12. Interpreting the Trade-off.** Two columns. Left, headed "Precision
> 0.713": "When it says trash, it is right 71% of the time". Right, headed
> "Recall 0.436": "It finds fewer than half of all litter instances". Below both,
> one highlighted line: "A missed frame is not a missed event. A false alarm
> destroys operator trust."
>
> **13. Why Low Recall Is Acceptable.** A schematic timeline of the same scene
> observed repeatedly over several seconds, some frames marked "detected", some
> "missed", with an arrow at the end labelled "event still confirmed". Keep it
> diagrammatic, not photographic.
>
> **14. What We Built.** Four bullets: trained a custom YOLOv8 model on TACO
> using transfer learning; integrated ByteTrack for object identity over time;
> designed a five-condition event rule; produced reviewable evidence for each
> incident.
>
> **15. Limitations.** Four bullets, stated honestly: recall of 0.436 means small
> or occluded litter is missed; person association is proximity-based, not
> pose-based; CPU inference limits throughput to about 13 frames per second; no
> cloud deployment, the model runs locally.
>
> **16. Future Work and Thanks.** Four bullets: train longer to improve recall;
> add pose estimation to detect the throwing motion; export to ONNX for faster
> inference; deploy to GPU infrastructure. Then a closing "Thank you" with the
> group member names: Muhammad Ali, Muneeb Roshan, Abdur Rahman, Arhum Farooq,
> Sami Ullah.

---

## After generating: three things to do

**1. Add the university crest** to slide 1. The file is at
`assets/uok-logo.png`.

**2. Insert your real images.** This matters more than anything else here:

| Slide | Add this |
|---|---|
| 6 | A sample prediction image (the grid with blue "trash" boxes) |
| 11 | `results.png` - the training curves |
| 12 | `confusion_matrix.png` |

Generated slides mixed with genuine model output read completely differently
from generated slides alone. A grader can tell the difference immediately.

**3. Check every number.** AI generators do paraphrase, and sometimes round or
invent figures. Verify against the report:

- mAP@0.5 = **0.513**
- mAP@0.5:0.95 = **0.366**
- Precision = **0.713**
- Recall = **0.436**
- 50 epochs, image size 640, batch 16
- approximately 3,597 images

If a slide says "high accuracy" or any figure you did not supply, fix it. An
incorrect number on screen while your voice says the correct one is worse than
having no slide at all.

---

## Which slide goes with which narration clip

| Narration clip | Slides |
|---|---|
| Clip 1 - Introduction and problem | 1, 2, 3 |
| Clip 2 - Dataset | 4, 5, 6 |
| Clip 3 - Model and training | 7, 8, 9, 10 |
| Clip 4 - Results | 11, 12, 13 |
| Clip 5 - Code overview | *your screen recording* |
| Clip 6 - Live demonstration | *your screen recording* |
| Clip 7 - Conclusion | 14, 15, 16 |

Roughly 25-30 seconds per slide. Open the deck in presentation mode, start
recording, and advance a slide whenever you reach the matching point in the
narration.

---

# Individual prompts (fallback only)

Use these **only** if the master prompt above produced a poor result and you want
to regenerate one section. Generating everything this way will give you an
inconsistent deck.

---

## CLIP 1 - Introduction and problem

**Prompt:**

> Create 3 slides for an AI course project introduction.
>
> Slide 1 - Title slide: "YELO - AI-Assisted Littering Detection". Subtitle:
> "CS-551 Artificial Intelligence, Department of Computer Science, University of
> Karachi". Leave space at the top for a university crest.
>
> Slide 2 - Title "The Problem". Four short bullets: guards cannot watch every
> area; CCTV is reviewed only after a complaint; continuous recording is
> expensive to store; continuous recording raises privacy concerns.
>
> Slide 3 - Title "Our Approach: Event-Driven Detection". Show a simple contrast:
> on the left, "Continuous recording - everything stored"; on the right,
> "Event-driven - analysed in memory, only incidents saved". Use a simple arrow
> or divider, no illustrations.

---

## CLIP 2 - Dataset

**Prompt:**

> Create 3 slides about a machine learning dataset.
>
> Slide 1 - Title "Dataset: TACO (Trash Annotations in Context)". A small table
> with: Source - Roboflow Universe; Version - 16; Size - approximately 3,597
> images; Format - YOLOv8; Licence - CC BY 4.0.
>
> Slide 2 - Title "Why TACO?". Four bullets: litter photographed in real
> environments, not on plain backgrounds; camera viewpoint matches ours; includes
> difficult backgrounds such as leaves, gravel and wet stone; openly licensed and
> reproducible.
>
> Slide 3 - Title "Single Class Design". Show many category names (plastic
> bottle, cigarette, can, wrapper, cardboard) converging with arrows into one
> box labelled "trash". Below, two short bullets: the application does not need
> the sub-type; merging increases examples per class.

**Add your own screenshot:** after generating, insert one of your sample
prediction images (the grid with blue boxes labelled "trash") into slide 3.
Real output from your model is worth more than any generated graphic.

---

## CLIP 3 - Model and training

**Prompt:**

> Create 4 slides about training an object detection model.
>
> Slide 1 - Title "Model: YOLOv8-small". Bullets: 11.14 million parameters;
> single-stage detector, one forward pass per frame; pretrained on COCO;
> fine-tuned on TACO.
>
> Slide 2 - Title "Why Transfer Learning?". A simple horizontal flow diagram:
> "COCO pretrained weights" arrow "knows edges, shapes, textures" arrow
> "fine-tune on litter" arrow "our model". Below: one line reading "Less data,
> less time, better accuracy than training from scratch".
>
> Slide 3 - Title "Data Augmentation (Feature Engineering)". A two-column table.
> Left column "Augmentation", right column "Real-world condition". Rows: HSV
> shift / different lighting and cameras; Rotation / camera not level;
> Translation / litter anywhere in frame; Scale / near versus far; Flip / no
> fixed orientation; Mosaic / more context per step; Random erase / partial
> occlusion.
>
> Slide 4 - Title "Training Configuration". A small table: Epochs 50; Image size
> 640; Batch size 16; Patience 15; Optimiser auto; Hardware Google Colab free T4
> GPU.

---

## CLIP 4 - Results

**Prompt:**

> Create 3 slides presenting machine learning evaluation results.
>
> Slide 1 - Title "Validation Results". Display four metrics prominently as large
> figures with labels beneath: mAP@0.5 = 0.513; mAP@0.5:0.95 = 0.366; Precision =
> 0.713; Recall = 0.436.
>
> Slide 2 - Title "Interpreting the Trade-off". Two columns. Left, headed
> "Precision 0.713": "When it says trash, it is right 71% of the time". Right,
> headed "Recall 0.436": "It finds fewer than half of all litter instances".
> Below both, a highlighted line: "A missed frame is not a missed event. A false
> alarm destroys operator trust."
>
> Slide 3 - Title "Why Low Recall Is Acceptable Here". A simple timeline showing
> the same scene observed repeatedly over several seconds, with some frames
> marked "detected" and some "missed", and an arrow at the end labelled "event
> still confirmed". Keep it schematic, not photographic.

**Add your own charts:** replace or supplement these with your actual
`results.png` and `confusion_matrix.png` from the training notebook. Real
training curves are far more convincing than generated approximations.

---

## CLIP 7 - Conclusion

**Prompt:**

> Create 3 closing slides for a university project presentation.
>
> Slide 1 - Title "What We Built". Four bullets: trained a custom YOLOv8 model on
> TACO using transfer learning; integrated ByteTrack for object identity over
> time; designed a five-condition event rule; produced reviewable evidence for
> each incident.
>
> Slide 2 - Title "Limitations". Four honest bullets: recall of 0.436 means small
> or occluded litter is missed; person association is proximity-based, not
> pose-based; CPU inference limits throughput to about 13 frames per second; no
> cloud deployment, the model runs locally.
>
> Slide 3 - Title "Future Work". Four bullets: train longer to improve recall;
> add pose estimation to detect the throwing motion; export to ONNX for faster
> inference; deploy to GPU infrastructure. End with a simple "Thank you" and the
> group member names.

---

## Assembling the video

1. **Generate slides** for clips 1, 2, 3, 4 and 7 using the prompts above.
2. **Insert your real images** - sample predictions, `results.png`,
   `confusion_matrix.png`. This matters: mixing genuine output into generated
   slides is what stops the deck feeling hollow.
3. **Screen-record the slides** while reading the matching narration from
   `docs/NARRATION_SCRIPT.md`.
4. **Screen-record clips 5 and 6 yourself** - your code, and the live demo.
5. **Combine** all seven clips, or submit them as a numbered folder
   (`01-intro.mp4`, `02-dataset.mp4`, and so on).

Recording tip: open the slides in presentation mode, start your screen recorder,
and simply advance slides as you read. No editing required.

---

## The one thing you must not skip

**Declare it.** Add this to `AI_USAGE_DECLARATION.md`:

> **Demonstration video.** Explanatory slides used in sections 1, 2, 3, 4 and 7
> of our demonstration video were generated with [tool name] from content we
> wrote. All narration is our own voice. The code walkthrough and live execution
> sections were recorded directly from our own machine with no AI assistance.

Disclosed AI use is allowed under the course policy. Undisclosed AI use is what
is treated as academic misconduct.
