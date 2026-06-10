"""Zero-dependency YELO frame ingestion gateway for the local MVP."""

from __future__ import annotations

import hashlib
import json
import math
import os
import struct
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any


HOST = os.getenv("YELO_INFERENCE_HOST", "0.0.0.0")
PORT = int(os.getenv("YELO_INFERENCE_PORT", "8000"))
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
MAX_FRAME_BYTES = 2 * 1024 * 1024
TOKEN_CACHE_SECONDS = 30
MODEL_PATH = os.getenv("YELO_MODEL_PATH", "yolo26n.pt")
MODEL_DEVICE = os.getenv("YELO_MODEL_DEVICE", "cpu")
MODEL_CONFIDENCE = float(os.getenv("YELO_MODEL_CONFIDENCE", "0.35"))
MODEL_IMAGE_SIZE = int(os.getenv("YELO_MODEL_IMAGE_SIZE", "640"))
TRACKER_CONFIG = os.getenv("YELO_TRACKER_CONFIG", "bytetrack.yaml")
TRACKER_STALE_SECONDS = int(os.getenv("YELO_TRACKER_STALE_SECONDS", "120"))
TRACK_HISTORY_LENGTH = int(os.getenv("YELO_TRACK_HISTORY_LENGTH", "20"))
configured_classes = {
    value.strip().lower()
    for value in os.getenv("YELO_DETECTION_CLASSES", "").split(",")
    if value.strip()
}

token_cache: dict[str, tuple[float, dict[str, Any]]] = {}
frame_stats: dict[str, dict[str, Any]] = {}
model_lock = threading.Lock()
model: Any | None = None
model_error: str | None = None
camera_models: dict[str, Any] = {}
camera_model_seen: dict[str, float] = {}
track_history: dict[str, dict[int, list[tuple[float, float]]]] = {}


def load_model() -> None:
    global model, model_error
    try:
        from ultralytics import YOLO

        model = YOLO(MODEL_PATH)
        model_error = None
    except Exception as error:  # Optional runtime dependency and model file.
        model = None
        model_error = str(error)


load_model()


def cleanup_stale_trackers(now: float) -> None:
    stale_camera_ids = [
        camera_id
        for camera_id, last_seen in camera_model_seen.items()
        if now - last_seen > TRACKER_STALE_SECONDS
    ]
    for camera_id in stale_camera_ids:
        camera_models.pop(camera_id, None)
        camera_model_seen.pop(camera_id, None)
        track_history.pop(camera_id, None)


def camera_model(camera_id: str) -> Any:
    from ultralytics import YOLO

    now = time.monotonic()
    cleanup_stale_trackers(now)
    tracker_model = camera_models.get(camera_id)
    if tracker_model is None:
        tracker_model = YOLO(MODEL_PATH)
        camera_models[camera_id] = tracker_model
        track_history[camera_id] = {}
    camera_model_seen[camera_id] = now
    return tracker_model


def json_bytes(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, separators=(",", ":")).encode("utf-8")


def jpeg_dimensions(data: bytes) -> tuple[int, int] | None:
    if len(data) < 4 or data[:2] != b"\xff\xd8":
        return None
    offset = 2
    while offset + 4 <= len(data):
        if data[offset] != 0xFF:
            offset += 1
            continue
        marker = data[offset + 1]
        offset += 2
        if marker in (0xD8, 0xD9):
            continue
        if offset + 2 > len(data):
            return None
        segment_length = struct.unpack(">H", data[offset : offset + 2])[0]
        if segment_length < 2 or offset + segment_length > len(data):
            return None
        if marker in {
            0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
            0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF,
        }:
            if segment_length < 7:
                return None
            height, width = struct.unpack(">HH", data[offset + 3 : offset + 7])
            return width, height
        offset += segment_length
    return None


def validate_camera(token: str, expected_camera_id: str) -> dict[str, Any]:
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY are required.")

    cache_key = hashlib.sha256(token.encode("utf-8")).hexdigest()
    cached = token_cache.get(cache_key)
    now = time.monotonic()
    if cached and now - cached[0] < TOKEN_CACHE_SECONDS:
        camera = cached[1]
    else:
        request = urllib.request.Request(
            f"{SUPABASE_URL}/functions/v1/camera-device",
            data=json_bytes({"action": "heartbeat", "token": token}),
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=8) as response:
                result = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            if error.code in (401, 403):
                raise PermissionError("The camera token is invalid or revoked.") from error
            raise RuntimeError(f"Camera validation failed with HTTP {error.code}.") from error
        except urllib.error.URLError as error:
            raise RuntimeError("Supabase camera validation is unavailable.") from error
        camera = result["camera"]
        token_cache[cache_key] = (now, camera)

    if camera.get("id") != expected_camera_id:
        raise PermissionError("The token does not belong to this camera.")
    return camera


def process_frame(camera: dict[str, Any], frame: bytes) -> dict[str, Any]:
    """Run YOLO on one in-memory JPEG and return normalized detections."""
    dimensions = jpeg_dimensions(frame)
    if not dimensions:
        raise ValueError("The request body is not a valid JPEG frame.")
    width, height = dimensions
    detections: list[dict[str, Any]] = []
    inference_ms: float | None = None
    camera_id = str(camera["id"])

    if model is not None:
        import cv2
        import numpy

        image = cv2.imdecode(numpy.frombuffer(frame, dtype=numpy.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("OpenCV could not decode the JPEG frame.")
        with model_lock:
            result = camera_model(camera_id).track(
                source=image,
                persist=True,
                tracker=TRACKER_CONFIG,
                conf=MODEL_CONFIDENCE,
                imgsz=MODEL_IMAGE_SIZE,
                device=MODEL_DEVICE,
                max_det=100,
                verbose=False,
            )[0]
        inference_ms = round(float(result.speed.get("inference", 0)), 1)
        if result.boxes is not None:
            boxes = result.boxes.xyxy.cpu().tolist()
            confidences = result.boxes.conf.cpu().tolist()
            class_ids = result.boxes.cls.cpu().tolist()
            if result.boxes.is_track and result.boxes.id is not None:
                track_ids: list[int | None] = result.boxes.id.int().cpu().tolist()
            else:
                track_ids = [None] * len(boxes)
            histories = track_history.setdefault(camera_id, {})
            active_track_ids: set[int] = set()
            for box, confidence, class_id_value, track_id in zip(
                boxes,
                confidences,
                class_ids,
                track_ids,
            ):
                class_id = int(class_id_value)
                label = str(result.names[class_id])
                if configured_classes and label.lower() not in configured_classes:
                    continue
                x1, y1, x2, y2 = box
                normalized_x1 = min(1.0, max(0.0, x1 / width))
                normalized_y1 = min(1.0, max(0.0, y1 / height))
                normalized_x2 = min(1.0, max(0.0, x2 / width))
                normalized_y2 = min(1.0, max(0.0, y2 / height))
                center = (
                    round((normalized_x1 + normalized_x2) / 2, 5),
                    round((normalized_y1 + normalized_y2) / 2, 5),
                )
                trail: list[tuple[float, float]] = []
                motion = {"dx": 0.0, "dy": 0.0, "distance": 0.0}
                if track_id is not None:
                    active_track_ids.add(track_id)
                    trail = histories.setdefault(track_id, [])
                    previous = trail[-1] if trail else center
                    trail.append(center)
                    del trail[:-TRACK_HISTORY_LENGTH]
                    dx = center[0] - previous[0]
                    dy = center[1] - previous[1]
                    motion = {
                        "dx": round(dx, 5),
                        "dy": round(dy, 5),
                        "distance": round(math.hypot(dx, dy), 5),
                    }
                detections.append(
                    {
                        "classId": class_id,
                        "label": label,
                        "confidence": round(float(confidence), 4),
                        "trackId": track_id,
                        "center": {"x": center[0], "y": center[1]},
                        "motion": motion,
                        "trail": [
                            {"x": point[0], "y": point[1]}
                            for point in trail
                        ],
                        "box": {
                            "x": round(normalized_x1, 5),
                            "y": round(normalized_y1, 5),
                            "width": round(max(0.0, normalized_x2 - normalized_x1), 5),
                            "height": round(max(0.0, normalized_y2 - normalized_y1), 5),
                        },
                    }
                )
            for stale_track_id in set(histories) - active_track_ids:
                histories.pop(stale_track_id, None)

    stats = frame_stats.setdefault(camera_id, {"received": 0})
    stats.update(
        {
            "received": int(stats["received"]) + 1,
            "last_received_at": time.time(),
            "width": width,
            "height": height,
            "bytes": len(frame),
        }
    )
    return {
        "accepted": True,
        "cameraId": camera_id,
        "frameNumber": stats["received"],
        "width": width,
        "height": height,
        "bytes": len(frame),
        "detections": detections,
        "detectionCount": len(detections),
        "inferenceMs": inference_ms,
        "modelReady": model is not None,
        "modelName": MODEL_PATH if model is not None else None,
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "YELOInference/0.1"

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, X-YELO-Camera-Id, X-YELO-Camera-Token, X-YELO-Captured-At",
        )
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/health":
            self.send_json(
                200,
                {
                    "status": "ready",
                    "service": "yelo-inference",
                    "modelReady": model is not None,
                    "modelName": MODEL_PATH if model is not None else None,
                    "modelDevice": MODEL_DEVICE,
                    "modelError": model_error,
                    "tracker": TRACKER_CONFIG,
                    "activeTrackers": len(camera_models),
                    "confidence": MODEL_CONFIDENCE,
                    "classFilter": sorted(configured_classes),
                    "activeCameras": len(frame_stats),
                },
            )
            return
        self.send_json(404, {"error": "Not found."})

    def do_POST(self) -> None:
        if self.path != "/frames":
            self.send_json(404, {"error": "Not found."})
            return
        if self.headers.get_content_type() != "image/jpeg":
            self.send_json(415, {"error": "Send frames as image/jpeg."})
            return

        camera_id = self.headers.get("X-YELO-Camera-Id", "").strip()
        token = self.headers.get("X-YELO-Camera-Token", "").strip()
        if not camera_id or not token:
            self.send_json(401, {"error": "Camera ID and token are required."})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_json(400, {"error": "Invalid Content-Length."})
            return
        if content_length <= 0 or content_length > MAX_FRAME_BYTES:
            self.send_json(413, {"error": "Frame must be between 1 byte and 2 MB."})
            return

        frame = self.rfile.read(content_length)
        try:
            camera = validate_camera(token, camera_id)
            result = process_frame(camera, frame)
        except PermissionError as error:
            self.send_json(401, {"error": str(error)})
            return
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
            return
        except RuntimeError as error:
            self.send_json(503, {"error": str(error)})
            return

        self.send_json(202, result)

    def log_message(self, message: str, *args: object) -> None:
        print(f"[{self.log_date_time_string()}] {message % args}")


if __name__ == "__main__":
    print(f"YELO inference gateway listening on http://{HOST}:{PORT}")
    print("Frames are validated and processed in memory; continuous video is not stored.")
    if model is not None:
        print(f"YOLO model ready: {MODEL_PATH} on {MODEL_DEVICE}")
    else:
        print(f"YOLO model unavailable: {model_error}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
