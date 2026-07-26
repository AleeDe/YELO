# Custom Garbage Model - Google Colab Training Plan

Goal: train YELO's own YOLO garbage/litter detector to replace the pretrained
COCO model. Output is a `best.pt` file that drops into the inference gateway.

> **Status: completed.** This plan was carried out on 24 July 2026. The dataset
> used was **TACO (Trash Annotations in Context), Roboflow version 16**, with
> all categories merged into a single `trash` class. The resulting model is
> `models/yolo_garbage.pt`.
>
> | Metric | Result |
> |---|---|
> | mAP@0.5 | 0.513 |
> | mAP@0.5:0.95 | 0.366 |
> | Precision | 0.713 |
> | Recall | 0.436 |
>
> Full analysis is in the project [README](../README.md#7-results).

## 0. Before you start
- Google account (Colab is free, gives a free T4 GPU).
- A garbage dataset in YOLO format. Easiest source: Roboflow Universe
  (search "garbage", "litter", "TACO"). Use its "Download -> YOLOv8" option.

## 1. Colab setup
Open https://colab.research.google.com -> new notebook ->
Runtime -> Change runtime type -> Hardware accelerator: **T4 GPU** -> Save.

## 2. Install Ultralytics
```python
!pip install ultralytics
from ultralytics import YOLO
import os
```

## 3. Get the dataset
Roboflow gives you a snippet like this (paste your own key/version):
```python
!pip install roboflow
from roboflow import Roboflow
rf = Roboflow(api_key="YOUR_KEY")
project = rf.workspace("some-workspace").project("garbage-detection")
dataset = project.version(1).download("yolov8")
# dataset.location now holds the folder path, e.g. /content/garbage-detection-1
```
The download contains a `data.yaml` describing train/val paths and class names.

## 4. Train
Start from a small pretrained model so training is fast and needs less data
(transfer learning). yolov8n = nano (fast), yolov8s = small (a bit better).
```python
model = YOLO("yolov8s.pt")          # pretrained starting point
model.train(
    data=f"{dataset.location}/data.yaml",
    epochs=50,                       # 50-100 is fine for a class project
    imgsz=640,
    batch=16,
    patience=15,                     # early stop if it stops improving
    project="yelo_garbage",
    name="run1",
)
```
The best weights land at `yelo_garbage/run1/weights/best.pt`.

## 5. Check how good it is
```python
metrics = model.val()
print(metrics.box.map)     # mAP@0.5:0.95  (higher is better)
print(metrics.box.map50)   # mAP@0.5
```
Also open the auto-generated plots: `results.png`, `confusion_matrix.png`,
`val_batch0_pred.jpg` - great screenshots for the report/viva.

## 6. Quick visual test
```python
best = YOLO("yelo_garbage/run1/weights/best.pt")
best.predict("path/to/a/test/photo.jpg", save=True, conf=0.25)
# saved annotated image shows the boxes it drew
```

## 7. Download the model
```python
from google.colab import files
files.download("yelo_garbage/run1/weights/best.pt")
```

## 8. Plug it into YELO
1. Copy `best.pt` to the repo root, rename to something clear:
   `D:\University\AI\Assignment\YELO\yolo_garbage.pt`
2. Tell the gateway to use it (one of):
   - set env var `YELO_MODEL_PATH=models/yolo_garbage.pt` before starting, OR
   - in `services/inference/.env` add `YELO_MODEL_PATH=models/yolo_garbage.pt`
3. If your dataset's class is literally named `garbage` (not `bottle`/`cup`),
   also set the waste classes so the event logic recognises it:
   `YELO_WASTE_CLASSES=garbage`
   (add every litter class name your data.yaml defines, comma-separated)
4. Restart `python server.py`, open `/health`, confirm
   `"modelName": "yolo_garbage.pt"` and `"modelReady": true`.

## Notes for the report
- This is transfer learning: we fine-tune a COCO-pretrained YOLO on a garbage
  dataset instead of training from scratch - far less data and time needed.
- Colab is for TRAINING only. Inference still runs on the laptop gateway.
- Keep the old `yolo26m.pt` as a fallback in case the custom model underperforms.
  (In practice the custom model performed better *and* faster, so the gateway
  now runs `yolo_garbage.pt` at `imgsz=480`.)
