# Models

All YOLO weight files used by the inference gateway.

## Files

| File | Size | Classes | Source |
|---|---|---|---|
| **`yolo_garbage.pt`** | 22 MB | 1 (`trash`) | **Our trained model** - YOLOv8s fine-tuned on TACO |
| `yolo26n.pt` | 5.3 MB | 80 (COCO) | Pretrained, downloaded from Ultralytics |
| `yolo26s.pt` | 20 MB | 80 (COCO) | Pretrained, downloaded from Ultralytics |
| `yolo26m.pt` | 43 MB | 80 (COCO) | Pretrained, downloaded from Ultralytics |
| `yolo26l.pt` | 51 MB | 80 (COCO) | Pretrained, downloaded from Ultralytics |

Only `yolo_garbage.pt` is committed to this repository. The pretrained COCO
checkpoints are gitignored because Ultralytics re-downloads them automatically
on first use.

## Which one to use

`models/yolo_garbage.pt` at `imgsz=480`. It is the only model actually trained
on litter, and on CPU it is also the fastest option we measured (75 ms per
frame). See [README section 8](../README.md#8-choosing-a-model---pretrained-vs-custom)
for the full benchmark.

## How the gateway finds them

Set `YELO_MODEL_PATH` in `services/inference/.env`:

```ini
YELO_MODEL_PATH=models/yolo_garbage.pt
YELO_WASTE_CLASSES=trash
YELO_MODEL_IMAGE_SIZE=480
```

The path is resolved relative to the repository root, so the gateway works no
matter which directory it is launched from. A bare file name
(`YELO_MODEL_PATH=yolo_garbage.pt`) also works - the gateway looks inside this
directory automatically.

If the named file is not present, Ultralytics attempts to download it by name.
That works for the public `yolo26*` weights but not for `yolo_garbage.pt`,
which exists only in this project.

## About `yolo_garbage.pt`

| | |
|---|---|
| Architecture | YOLOv8s, 11.14 M parameters |
| Base weights | `yolov8s.pt` (COCO-pretrained) |
| Method | Transfer learning with data augmentation |
| Dataset | TACO v16, ~3,597 images (see [`../DATASET.md`](../DATASET.md)) |
| Training | 50 epochs, imgsz 640, batch 16, free Colab T4 GPU |
| Trained on | 24 July 2026 |

**Validation results**

| Metric | Value |
|---|---|
| mAP@0.5 | 0.513 |
| mAP@0.5:0.95 | 0.366 |
| Precision | 0.713 |
| Recall | 0.436 |

The training notebook, with all outputs preserved, is
[`../docs/colab_train_garbage.ipynb`](../docs/colab_train_garbage.ipynb).

## Quick test

```bash
python -c "from ultralytics import YOLO; YOLO('models/yolo_garbage.pt').predict('photo.jpg', save=True, conf=0.25)"
```

The annotated image is written to `runs/detect/predict/`.
