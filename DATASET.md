# Dataset

The dataset used to train this project's model is **TACO (Trash Annotations in
Context)**, obtained from Roboflow Universe in YOLOv8 detection format.

## Download

The dataset is approximately 1-2 GB, so it is not committed to this repository.

**Download link:**

> https://drive.google.com/drive/folders/1ZILumZ_xvB2R9ih7rlQ7W8XpK_qKB6Nb?usp=sharing

That folder contains:

| File | Description |
|---|---|
| `TACO_v16_yolov8.zip` | Complete dataset: train / valid / test splits plus `data.yaml` |
| `data.yaml` | Class names and split paths, readable without unzipping |
| `README.txt` | Source, version, licence, and citation |

## Details

| | |
|---|---|
| **Name** | TACO - Trash Annotations in Context |
| **Roboflow workspace** | `mohamed-traore-2ekkp` |
| **Roboflow project** | `taco-trash-annotations-in-context` |
| **Version** | 16 (resize-640, 3x augmented, all classes) |
| **Size** | ~3,597 images across train / valid / test |
| **Format** | YOLOv8 detection |

## Structure

```
TACO_v16_yolov8/
├── train/
│   ├── images/      .jpg files
│   └── labels/      one .txt per image
├── valid/
│   ├── images/
│   └── labels/
├── test/
│   ├── images/
│   └── labels/
└── data.yaml        class names and split paths
```

Labels are in YOLO format - one `.txt` per image, one line per object:

```
<class_id> <x_center> <y_center> <width> <height>
```

All coordinates are normalised to the range 0-1, so they are independent of
image resolution.

## Why this dataset

TACO photographs litter **in context** - on pavements, in grass, in gutters, on
sand - rather than as isolated objects on a plain background. That matches what
a society camera actually sees, and it includes the difficult backgrounds (dry
leaves, gravel, wet stone, shadows) that cause false positives. The full
reasoning is in [README section 4](README.md#4-dataset).

## Class configuration

The published dataset carries fine-grained litter categories. We merged them
into a **single `trash` class**, because the application only needs to know that
littering occurred, not what type of item was dropped. Our trained model
therefore reports:

```python
names = {0: 'trash'}
```

## Reproducing the download

```python
from roboflow import Roboflow

rf = Roboflow(api_key="YOUR_ROBOFLOW_API_KEY")
project = rf.workspace("mohamed-traore-2ekkp").project("taco-trash-annotations-in-context")
dataset = project.version(16).download("yolov8")

print("Downloaded to:", dataset.location)
```

A free Roboflow account is required for the API key. The full training pipeline,
already executed with its outputs preserved, is in
[`docs/colab_train_garbage.ipynb`](docs/colab_train_garbage.ipynb).

## Licence and attribution

TACO is released under **CC BY 4.0**
(https://creativecommons.org/licenses/by/4.0/), which permits redistribution
with attribution.

> Proenca, P. F. and Simoes, P. (2020). *TACO: Trash Annotations in Context for
> Litter Detection.* arXiv:2003.06975.

- Website: http://tacodataset.org/
- Paper: https://arxiv.org/abs/2003.06975

We redistribute it unmodified apart from the class merge described above.
