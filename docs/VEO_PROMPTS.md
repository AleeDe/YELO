# Gemini / Veo Video Prompts

Prompts for generating **B-roll footage** with Google Veo (in the Gemini app) to
use as background during the spoken narration.

---

## Read this first: what Veo can and cannot do

Veo generates **cinematic footage** - real-looking scenes, people, places, camera
movement. It knows nothing about your project.

| Veo can generate | Veo cannot generate |
|---|---|
| A street with litter on the ground | Your dashboard |
| Someone dropping a wrapper and walking away | Your model detecting litter |
| A CCTV camera on a pole | Any text, number, or metric |
| Abstract technology visuals | Training curves or the confusion matrix |
| A park, an alley, a residential area | Your code |

**Practical limits:**

- Clips are about **8 seconds** each. A 9-minute video would need 60+ clips.
- Veo cannot reliably render readable text. Never ask it for your metrics.
- Free-tier generation is rate-limited.

**So use Veo for what it is good at:** short atmospheric background footage
during the problem statement. That is roughly 30-45 seconds of your video.
Everything else stays as slides and screen recordings.

---

## Where Veo footage goes in your video

| Clip | Content | Visual source |
|---|---|---|
| **1** | **Introduction and problem** | **Veo b-roll** + title slide |
| 2 | Dataset | Slides + your sample prediction images |
| 3 | Model and training | Slides |
| 4 | Results | Slides + `results.png`, `confusion_matrix.png` |
| 5 | Code overview | Your screen recording |
| 6 | Live demonstration | Your screen recording |
| 7 | Conclusion | Slides |

Only clip 1 uses generated footage. This is deliberate: the remaining sections
must show your actual work, and generated footage there would add nothing while
increasing what you have to declare.

---

## Prompt 1 - Litter on a residential street (opening shot)

Use under: *"Littering in residential societies is very difficult to police."*

> A slow cinematic dolly shot moving forward along a quiet residential street in
> a warm climate. Scattered litter on the pavement - a crushed plastic bottle, a
> food wrapper, a paper cup near a kerb. Early morning light, long soft shadows.
> Muted natural colours, shallow depth of field. Documentary style, realistic,
> no people in frame. 4K, steady slow motion.

---

## Prompt 2 - Security camera looking down (surveillance context)

Use under: *"Guards cannot watch every corner, and CCTV footage is normally
reviewed only after somebody complains."*

> A static wide shot of a white CCTV security camera mounted on a pole,
> photographed from below against an overcast sky. The camera slowly rotates on
> its mount. Residential buildings blurred in the background. Cool desaturated
> tones, documentary realism, no text, no people. Slow subtle motion.

---

## Prompt 3 - The littering act (the behaviour being detected)

Use under: *"...by which time the person responsible is long gone."*

> A medium shot from a fixed elevated camera position, looking down at a paved
> walkway. A person walks through frame from left to right and drops a plastic
> bottle on the ground without stopping, then continues walking out of frame.
> The bottle remains on the ground. Natural daylight, realistic documentary
> style, seen from behind so no face is visible. Static camera, no zoom.

**Note:** this is the single most useful clip, because it visually shows the exact
behaviour your system detects. Generate this one first.

---

## Prompt 4 - Clean versus littered contrast (optional)

Use under: *"So our system is event-driven."*

> A slow static shot of a clean, well-maintained residential walkway with green
> plants along the edge, bright natural morning light, calm and orderly.
> Realistic documentary style, no people, no text. Gentle slow camera push
> forward.

---

## Prompt 5 - Abstract technology transition (optional)

Use as a short bridge between the problem section and the technical sections.

> Abstract dark visualisation of flowing data - thin green light trails moving
> across a deep slate background, subtle particle motion, slow and smooth. Clean
> minimal technology aesthetic. No text, no logos, no user interface elements.
> Seamless slow motion.

---

## How to generate these

1. Open the **Gemini app** (gemini.google.com) and select video generation, or
   use **Google Flow** (labs.google/flow) if you have access.
2. Paste one prompt at a time. Each produces roughly 8 seconds.
3. Download each clip.
4. **Generate prompt 3 first.** If you only get one usable clip, that is the one
   worth having.

Veo is rate-limited on free tiers. Prompts 1, 2 and 3 are the priority; 4 and 5
are optional.

---

## How to use the footage

The b-roll plays **behind your voice**, not instead of it.

Structure for clip 1 (about 70 seconds total):

| Time | On screen | You are saying |
|---|---|---|
| 0:00-0:10 | Title slide with university crest | Greeting, project and course name |
| 0:10-0:25 | Veo clip 1 (street with litter) | The enforcement problem |
| 0:25-0:40 | Veo clip 2 (CCTV camera) | Guards and CCTV limitations |
| 0:40-0:52 | Veo clip 3 (the littering act) | The person is long gone |
| 0:52-1:10 | Slide: event-driven approach | Our approach, and the real problem |

After clip 1, switch to slides and screen recordings for the rest.

---

## Assembling without an editor

You do not need editing software. Two options:

**Option A - play the clips while recording.** Open the Veo clips in a media
player, start your screen recorder, and play them in sequence while reading the
narration. Everything is captured in one pass.

**Option B - submit as separate files.** Record each section separately and
submit a numbered folder (`01-intro.mp4`, `02-dataset.mp4`, and so on). No
editing at all.

If you do want to join them, **Descript** and **CapCut** are both free and
straightforward.

---

## Required declaration

Generated footage must be declared. Add this to `AI_USAGE_DECLARATION.md`:

> **Demonstration video.** Background footage used during the problem-statement
> section was generated with Google Veo (Gemini). Explanatory slides were
> generated with [tool name]. All narration is our own voice, and the code
> walkthrough and live execution sections were screen-recorded directly from our
> own machine with no AI assistance.

---

## One honest recommendation

The generated footage makes your opening look polished. It does not demonstrate
anything about your project.

If time is short today, **skip Veo entirely and record clip 6 properly instead.**
A clear live demonstration of your system detecting a dropped bottle is worth
more to your grade than any amount of cinematic b-roll. The b-roll is decoration;
the demo is evidence.
