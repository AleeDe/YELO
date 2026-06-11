"""Zero-dependency YELO frame ingestion gateway for the local MVP."""

from __future__ import annotations

import hashlib
import base64
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


def _load_env_files() -> None:
    """Populate the environment from local .env files so the gateway works
    without manually exporting variables on every launch.

    Looks first at services/inference/.env, then falls back to the dashboard's
    .env.local (mapping NEXT_PUBLIC_SUPABASE_* to the names this server uses).
    Existing environment variables always take precedence."""
    here = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.normpath(os.path.join(here, "..", ".."))
    alias = {
        "NEXT_PUBLIC_SUPABASE_URL": "SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": "SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_YELO_INFERENCE_URL": "YELO_INFERENCE_URL",
    }
    for candidate in (
        os.path.join(here, ".env"),
        os.path.join(repo_root, "apps", "dashboard", ".env.local"),
    ):
        if not os.path.exists(candidate):
            continue
        try:
            with open(candidate, "r", encoding="utf-8") as handle:
                for raw in handle:
                    line = raw.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, _, value = line.partition("=")
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    for name in (key, alias.get(key)):
                        if name and name not in os.environ:
                            os.environ[name] = value
        except OSError:
            pass


_load_env_files()


HOST = os.getenv("YELO_INFERENCE_HOST", "0.0.0.0")
PORT = int(os.getenv("YELO_INFERENCE_PORT", "8000"))
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
MAX_FRAME_BYTES = 2 * 1024 * 1024
# Camera config (zones, confirmation delay) refreshes when this expires, so
# keep it short enough that restricted-zone edits reach detection quickly.
TOKEN_CACHE_SECONDS = int(os.getenv("YELO_TOKEN_CACHE_SECONDS", "10"))
# Medium is the best accuracy/latency balance on CPU; large lags at ~1 fps.
MODEL_PATH = os.getenv("YELO_MODEL_PATH", "yolo26m.pt")
# Weights live at the repository root; resolve them regardless of the
# directory the gateway is launched from.
if not os.path.isabs(MODEL_PATH) and not os.path.exists(MODEL_PATH):
    _repo_root_candidate = os.path.normpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", MODEL_PATH)
    )
    if os.path.exists(_repo_root_candidate):
        MODEL_PATH = _repo_root_candidate
MODEL_DEVICE = os.getenv("YELO_MODEL_DEVICE", "cpu")
MODEL_CONFIDENCE = float(os.getenv("YELO_MODEL_CONFIDENCE", "0.2"))
MODEL_IMAGE_SIZE = int(os.getenv("YELO_MODEL_IMAGE_SIZE", "960"))
TRACKER_CONFIG = os.getenv("YELO_TRACKER_CONFIG", "bytetrack.yaml")
TRACKER_STALE_SECONDS = int(os.getenv("YELO_TRACKER_STALE_SECONDS", "120"))
TRACK_HISTORY_LENGTH = int(os.getenv("YELO_TRACK_HISTORY_LENGTH", "20"))
EVENT_REPORT_URL = os.getenv(
    "YELO_EVENT_REPORT_URL",
    f"{SUPABASE_URL}/functions/v1/report-camera-event" if SUPABASE_URL else "",
)
EVENT_STATIONARY_DISTANCE = float(
    os.getenv("YELO_EVENT_STATIONARY_DISTANCE", "0.015")
)
EVENT_PERSON_DISTANCE = float(os.getenv("YELO_EVENT_PERSON_DISTANCE", "0.75"))
EVENT_PERSON_MEMORY_SECONDS = float(
    os.getenv("YELO_EVENT_PERSON_MEMORY_SECONDS", "15")
)
EVENT_CANDIDATE_GRACE_SECONDS = float(
    os.getenv("YELO_EVENT_CANDIDATE_GRACE_SECONDS", "12")
)
EVENT_COOLDOWN_SECONDS = int(os.getenv("YELO_EVENT_COOLDOWN_SECONDS", "120"))
CLIP_ENABLED = os.getenv("YELO_CLIP_ENABLED", "1") not in {"0", "false", "no"}
CLIP_PRE_SECONDS = float(os.getenv("YELO_CLIP_PRE_SECONDS", "60"))
CLIP_POST_SECONDS = float(os.getenv("YELO_CLIP_POST_SECONDS", "60"))
CLIP_PLAYBACK_FPS = float(os.getenv("YELO_CLIP_PLAYBACK_FPS", "4"))
CLIP_WIDTH = int(os.getenv("YELO_CLIP_WIDTH", "640"))
CLIP_MAX_UPLOAD_BYTES = int(os.getenv("YELO_CLIP_MAX_UPLOAD_BYTES", str(14 * 1024 * 1024)))
CLIP_REPORT_URL = os.getenv(
    "YELO_CLIP_REPORT_URL",
    f"{SUPABASE_URL}/functions/v1/attach-event-clip" if SUPABASE_URL else "",
)
WASTE_CLASSES = {
    value.strip().lower()
    for value in os.getenv(
        "YELO_WASTE_CLASSES",
        "bottle,cup,bowl,banana,apple,orange,backpack,handbag,suitcase",
    ).split(",")
    if value.strip()
}
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
event_candidates: dict[str, dict[str, dict[str, Any]]] = {}
event_cooldowns: dict[str, float] = {}
recent_people: dict[str, dict[int, dict[str, Any]]] = {}
# Rolling per-camera frame history used to assemble before/after evidence
# clips. Frames live only in memory and age out unless an event confirms.
frame_buffers: dict[str, list[tuple[float, bytes]]] = {}
frame_buffer_lock = threading.Lock()


def normalized_polygon(value: Any) -> list[tuple[float, float]]:
    if not isinstance(value, list):
        return []
    polygon: list[tuple[float, float]] = []
    for point in value:
        if not isinstance(point, dict):
            return []
        try:
            x = float(point["x"])
            y = float(point["y"])
        except (KeyError, TypeError, ValueError):
            return []
        if not 0 <= x <= 1 or not 0 <= y <= 1:
            return []
        polygon.append((x, y))
    return polygon if len(polygon) >= 3 else []


def point_in_polygon(point: tuple[float, float], polygon: list[tuple[float, float]]) -> bool:
    """Return whether a normalized point is inside a polygon."""
    x, y = point
    inside = False
    previous_x, previous_y = polygon[-1]
    for current_x, current_y in polygon:
        crosses_y = (current_y > y) != (previous_y > y)
        if crosses_y:
            boundary_x = (
                (previous_x - current_x)
                * (y - current_y)
                / (previous_y - current_y)
                + current_x
            )
            if x < boundary_x:
                inside = not inside
        previous_x, previous_y = current_x, current_y
    return inside


def camera_zones(camera: dict[str, Any]) -> list[dict[str, Any]]:
    zones: list[dict[str, Any]] = []
    for value in camera.get("restricted_zones", []):
        polygon = normalized_polygon(value.get("polygon"))
        if value.get("is_active") and polygon:
            zones.append(
                {
                    "id": str(value["id"]),
                    "name": str(value["name"]),
                    "polygon": polygon,
                }
            )
    return zones


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
        event_candidates.pop(camera_id, None)
        recent_people.pop(camera_id, None)


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


def normalized_distance(
    first: tuple[float, float],
    second: tuple[float, float],
) -> float:
    return math.hypot(first[0] - second[0], first[1] - second[1])


def nearest_person(
    camera_id: str,
    point: tuple[float, float],
    detections: list[dict[str, Any]],
) -> tuple[dict[str, Any] | None, float | None, float]:
    now = time.monotonic()
    remembered = recent_people.setdefault(camera_id, {})
    people = [
        detection
        for detection in detections
        if detection["label"].lower() == "person"
        and detection["trackId"] is not None
    ]
    for track_id, person in list(remembered.items()):
        if now - float(person["seenAt"]) > EVENT_PERSON_MEMORY_SECONDS:
            remembered.pop(track_id, None)
    available_people = people or list(remembered.values())
    if not available_people:
        return None, None, 0.0
    person = min(
        available_people,
        key=lambda detection: normalized_distance(
            point,
            (
                float(detection["groundPoint"]["x"]),
                float(detection["groundPoint"]["y"]),
            ),
        ),
    )
    age = max(0.0, now - float(person.get("seenAt", now)))
    return person, normalized_distance(
        point,
        (
            float(person["groundPoint"]["x"]),
            float(person["groundPoint"]["y"]),
        ),
    ), age


def report_confirmed_event(
    camera: dict[str, Any],
    token: str,
    frame: bytes,
    event: dict[str, Any],
) -> None:
    camera_id = str(camera["id"])
    stats = frame_stats.setdefault(camera_id, {"received": 0})
    stats["last_report_status"] = "sending"
    stats["last_report_error"] = None
    if not EVENT_REPORT_URL or not SUPABASE_ANON_KEY:
        stats["last_report_status"] = "not_configured"
        print("Event confirmed locally, but event reporting is not configured.")
        return
    payload = {
        "token": token,
        "cameraId": str(camera["id"]),
        "zoneId": event["zoneId"],
        "objectClass": event["objectClass"],
        "confidence": event["confidence"],
        "capturedAt": event["capturedAt"],
        "eventKey": event["eventKey"],
        "metadata": event["metadata"],
        "evidenceBase64": base64.b64encode(frame).decode("ascii"),
    }
    request = urllib.request.Request(
        EVENT_REPORT_URL,
        data=json_bytes(payload),
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            result = json.loads(response.read().decode("utf-8"))
            stats["last_report_status"] = "reported"
            stats["last_report_event_id"] = result.get("eventId")
            stats["last_report_at"] = time.time()
            print(f"Reported incident {result.get('eventId', 'unknown')}.")
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as error:
        stats["last_report_status"] = "failed"
        stats["last_report_error"] = str(error)
        stats["last_report_at"] = time.time()
        print(f"Incident reporting failed: {error}")


def start_event_report(
    camera: dict[str, Any],
    token: str,
    frame: bytes,
    event: dict[str, Any],
) -> None:
    threading.Thread(
        target=report_confirmed_event,
        args=(camera, token, frame, event),
        daemon=True,
    ).start()


def remember_frame(camera_id: str, frame: bytes) -> None:
    """Keep a short rolling window of frames for before/after evidence clips."""
    if not CLIP_ENABLED:
        return
    horizon = time.time() - (CLIP_PRE_SECONDS + CLIP_POST_SECONDS + 20)
    with frame_buffer_lock:
        buffer = frame_buffers.setdefault(camera_id, [])
        buffer.append((time.time(), frame))
        while buffer and buffer[0][0] < horizon:
            buffer.pop(0)


def encode_clip(frames: list[bytes]) -> tuple[bytes, str, str] | None:
    """Stitch JPEG frames into a browser-playable video (H.264, then VP8)."""
    import cv2
    import numpy

    decoded = []
    for frame in frames:
        image = cv2.imdecode(numpy.frombuffer(frame, dtype=numpy.uint8), cv2.IMREAD_COLOR)
        if image is None:
            continue
        height = int(round(image.shape[0] * (CLIP_WIDTH / image.shape[1])))
        decoded.append(cv2.resize(image, (CLIP_WIDTH, height)))
    if len(decoded) < 4:
        return None
    height = decoded[0].shape[0]
    decoded = [
        image if image.shape[0] == height else cv2.resize(image, (CLIP_WIDTH, height))
        for image in decoded
    ]
    import tempfile

    for fourcc, extension, content_type in (
        ("avc1", "mp4", "video/mp4"),
        ("VP80", "webm", "video/webm"),
    ):
        path = os.path.join(
            tempfile.gettempdir(),
            f"yelo-clip-{os.getpid()}-{threading.get_ident()}.{extension}",
        )
        writer = cv2.VideoWriter(
            path,
            cv2.VideoWriter_fourcc(*fourcc),
            max(1.0, CLIP_PLAYBACK_FPS),
            (CLIP_WIDTH, height),
        )
        if not writer.isOpened():
            writer.release()
            continue
        for image in decoded:
            writer.write(image)
        writer.release()
        try:
            with open(path, "rb") as handle:
                data = handle.read()
        finally:
            try:
                os.remove(path)
            except OSError:
                pass
        if len(data) > 1024:
            return data, extension, content_type
    return None


def capture_event_clip(
    camera: dict[str, Any],
    token: str,
    event: dict[str, Any],
    event_time: float,
) -> None:
    camera_id = str(camera["id"])
    stats = frame_stats.setdefault(camera_id, {"received": 0})
    stats["last_clip_status"] = "recording"
    deadline = event_time + CLIP_POST_SECONDS
    while time.time() < deadline + 5:
        time.sleep(2)
    with frame_buffer_lock:
        frames = [
            frame
            for timestamp, frame in frame_buffers.get(camera_id, [])
            if event_time - CLIP_PRE_SECONDS <= timestamp <= deadline
        ]
    clip = encode_clip(frames)
    if clip is None:
        stats["last_clip_status"] = "skipped_no_frames"
        return
    data, extension, content_type = clip
    if len(data) > CLIP_MAX_UPLOAD_BYTES:
        stats["last_clip_status"] = "skipped_too_large"
        print(f"Event clip skipped: {len(data)} bytes exceeds the upload limit.")
        return
    payload = {
        "token": token,
        "cameraId": camera_id,
        "eventKey": event["eventKey"],
        "contentType": content_type,
        "extension": extension,
        "startedAt": time.strftime(
            "%Y-%m-%dT%H:%M:%SZ", time.gmtime(event_time - CLIP_PRE_SECONDS)
        ),
        "frameCount": len(frames),
        "clipBase64": base64.b64encode(data).decode("ascii"),
    }
    request = urllib.request.Request(
        CLIP_REPORT_URL,
        data=json_bytes(payload),
        headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            json.loads(response.read().decode("utf-8"))
            stats["last_clip_status"] = "uploaded"
            print(f"Uploaded {len(frames)}-frame evidence clip ({len(data)} bytes).")
    except urllib.error.HTTPError as error:
        detail = ""
        try:
            detail = error.read().decode("utf-8")[:300]
        except OSError:
            pass
        stats["last_clip_status"] = "failed"
        stats["last_clip_error"] = f"{error} {detail}".strip()
        print(f"Evidence clip upload failed: {error} {detail}")
    except (urllib.error.URLError, TimeoutError) as error:
        stats["last_clip_status"] = "failed"
        stats["last_clip_error"] = str(error)
        print(f"Evidence clip upload failed: {error}")


def start_event_clip(
    camera: dict[str, Any],
    token: str,
    event: dict[str, Any],
) -> None:
    if not CLIP_ENABLED or not CLIP_REPORT_URL or not SUPABASE_ANON_KEY:
        return
    threading.Thread(
        target=capture_event_clip,
        args=(camera, token, event, time.time()),
        daemon=True,
    ).start()


def evaluate_littering_events(
    camera: dict[str, Any],
    detections: list[dict[str, Any]],
    captured_at: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    camera_id = str(camera["id"])
    now = time.monotonic()
    confirmation_seconds = max(1, int(camera.get("confirmation_seconds", 5)))
    candidates = event_candidates.setdefault(camera_id, {})
    candidate_statuses: list[dict[str, Any]] = []
    confirmed: list[dict[str, Any]] = []
    active_keys: set[str] = set()
    remembered = recent_people.setdefault(camera_id, {})

    for detection in detections:
        if (
            detection["label"].lower() == "person"
            and detection["trackId"] is not None
        ):
            remembered[int(detection["trackId"])] = {
                "trackId": int(detection["trackId"]),
                "groundPoint": detection["groundPoint"],
                "seenAt": now,
            }

    for detection in detections:
        track_id = detection["trackId"]
        if (
            track_id is None
            or detection["label"].lower() not in WASTE_CLASSES
            or not detection["inRestrictedZone"]
        ):
            continue
        ground_point = (
            float(detection["groundPoint"]["x"]),
            float(detection["groundPoint"]["y"]),
        )
        for zone in detection["zones"]:
            object_label = detection["label"].lower()
            key = f"{zone['id']}:{object_label}"
            active_keys.add(key)
            candidate = candidates.get(key)
            if candidate is None:
                person, person_distance, person_age = nearest_person(
                    camera_id,
                    ground_point,
                    detections,
                )
                if (
                    person is None
                    or person_distance is None
                    or person_distance > EVENT_PERSON_DISTANCE
                ):
                    continue
                candidate = {
                    "startedAt": now,
                    "lastPoint": ground_point,
                    "personTrackId": person["trackId"],
                    "personDistance": person_distance,
                    "personAge": person_age,
                    "initialTrackId": track_id,
                    "currentTrackId": track_id,
                    "maxConfidence": float(detection["confidence"]),
                    "stationary": True,
                    "lastSeenAt": now,
                }
                candidates[key] = candidate
            candidate["lastSeenAt"] = now
            candidate["currentTrackId"] = track_id
            movement = normalized_distance(candidate["lastPoint"], ground_point)
            candidate["lastPoint"] = ground_point
            candidate["maxConfidence"] = max(
                float(candidate["maxConfidence"]),
                float(detection["confidence"]),
            )
            if movement > EVENT_STATIONARY_DISTANCE:
                candidate["startedAt"] = now
                candidate["stationary"] = False
            else:
                candidate["stationary"] = True
            elapsed = max(0.0, now - float(candidate["startedAt"]))
            progress = min(1.0, elapsed / confirmation_seconds)
            candidate_statuses.append(
                {
                    "trackId": track_id,
                    "label": detection["label"],
                    "zoneId": zone["id"],
                    "zoneName": zone["name"],
                    "personTrackId": candidate["personTrackId"],
                    "personAgeSeconds": round(float(candidate["personAge"]), 1),
                    "stationary": candidate["stationary"],
                    "elapsedSeconds": round(elapsed, 1),
                    "requiredSeconds": confirmation_seconds,
                    "progress": round(progress, 3),
                }
            )
            cooldown_key = (
                f"{camera_id}:{zone['id']}:{object_label}"
            )
            if (
                candidate["stationary"]
                and elapsed >= confirmation_seconds
                and now >= event_cooldowns.get(cooldown_key, 0)
            ):
                event_cooldowns[cooldown_key] = now + EVENT_COOLDOWN_SECONDS
                event_key = hashlib.sha256(
                    f"{camera_id}:{zone['id']}:{track_id}:{captured_at}".encode("utf-8")
                ).hexdigest()
                confirmed.append(
                    {
                        "eventKey": event_key,
                        "zoneId": zone["id"],
                        "zoneName": zone["name"],
                        "objectClass": detection["label"],
                        "confidence": round(float(candidate["maxConfidence"]), 4),
                        "capturedAt": captured_at,
                        "metadata": {
                            "waste_track_id": candidate["initialTrackId"],
                            "latest_waste_track_id": candidate["currentTrackId"],
                            "person_track_id": candidate["personTrackId"],
                            "person_distance": round(
                                float(candidate["personDistance"]),
                                5,
                            ),
                            "person_age_seconds": round(
                                float(candidate["personAge"]),
                                2,
                            ),
                            "confirmation_seconds": confirmation_seconds,
                            "stationary_threshold": EVENT_STATIONARY_DISTANCE,
                            "association_rule": "recent_nearby_person_then_stationary_waste",
                        },
                    }
                )
                candidates.pop(key, None)

    for stale_key in set(candidates) - active_keys:
        candidate = candidates[stale_key]
        if now - float(candidate.get("lastSeenAt", now)) > EVENT_CANDIDATE_GRACE_SECONDS:
            candidates.pop(stale_key, None)
    return candidate_statuses, confirmed


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


def process_frame(
    camera: dict[str, Any],
    token: str,
    frame: bytes,
    captured_at: str,
) -> dict[str, Any]:
    """Run YOLO on one in-memory JPEG and return normalized detections."""
    dimensions = jpeg_dimensions(frame)
    if not dimensions:
        raise ValueError("The request body is not a valid JPEG frame.")
    width, height = dimensions
    remember_frame(str(camera["id"]), frame)
    detections: list[dict[str, Any]] = []
    inference_ms: float | None = None
    camera_id = str(camera["id"])
    zones = camera_zones(camera)
    violations: list[dict[str, Any]] = []

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
                end2end=False,
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
                ground_point = (
                    center[0],
                    round(normalized_y2, 5),
                )
                matched_zones = [
                    {"id": zone["id"], "name": zone["name"]}
                    for zone in zones
                    if point_in_polygon(ground_point, zone["polygon"])
                ]
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
                        "groundPoint": {
                            "x": ground_point[0],
                            "y": ground_point[1],
                        },
                        "motion": motion,
                        "inRestrictedZone": bool(matched_zones),
                        "zones": matched_zones,
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
                if matched_zones:
                    violations.append(
                        {
                            "trackId": track_id,
                            "label": label,
                            "confidence": round(float(confidence), 4),
                            "zones": matched_zones,
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
            "labels": [detection["label"] for detection in detections],
            "restricted_zone_count": len(zones),
            "violation_count": len(violations),
        }
    )
    candidates, confirmed_events = evaluate_littering_events(
        camera,
        detections,
        captured_at,
    )
    stats["event_candidate_count"] = len(candidates)
    stats["confirmed_event_count"] = len(confirmed_events)
    for event in confirmed_events:
        start_event_report(camera, token, frame, event)
        start_event_clip(camera, token, event)
    return {
        "accepted": True,
        "cameraId": camera_id,
        "frameNumber": stats["received"],
        "width": width,
        "height": height,
        "bytes": len(frame),
        "detections": detections,
        "detectionCount": len(detections),
        "restrictedZones": [
            {
                "id": zone["id"],
                "name": zone["name"],
                "polygon": [
                    {"x": point[0], "y": point[1]}
                    for point in zone["polygon"]
                ],
            }
            for zone in zones
        ],
        "violations": violations,
        "violationCount": len(violations),
        "eventCandidates": candidates,
        "confirmedEvents": confirmed_events,
        "eventCandidateCount": len(candidates),
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
                    "wasteClasses": sorted(WASTE_CLASSES),
                    "eventRules": {
                        "personDistance": EVENT_PERSON_DISTANCE,
                        "personMemorySeconds": EVENT_PERSON_MEMORY_SECONDS,
                        "candidateGraceSeconds": EVENT_CANDIDATE_GRACE_SECONDS,
                        "stationaryDistance": EVENT_STATIONARY_DISTANCE,
                    },
                    "eventReportingReady": bool(
                        EVENT_REPORT_URL and SUPABASE_ANON_KEY
                    ),
                    "clipCapture": {
                        "enabled": bool(
                            CLIP_ENABLED and CLIP_REPORT_URL and SUPABASE_ANON_KEY
                        ),
                        "preSeconds": CLIP_PRE_SECONDS,
                        "postSeconds": CLIP_POST_SECONDS,
                        "playbackFps": CLIP_PLAYBACK_FPS,
                    },
                    "activeCameras": len(frame_stats),
                    "cameraDiagnostics": [
                        {
                            "cameraId": camera_id,
                            "frameNumber": stats.get("received", 0),
                            "frameAgeSeconds": round(
                                max(
                                    0.0,
                                    time.time()
                                    - float(stats.get("last_received_at", time.time())),
                                ),
                                1,
                            ),
                            "labels": stats.get("labels", []),
                            "restrictedZoneCount": stats.get(
                                "restricted_zone_count",
                                0,
                            ),
                            "violationCount": stats.get("violation_count", 0),
                            "eventCandidateCount": stats.get(
                                "event_candidate_count",
                                0,
                            ),
                            "confirmedEventCount": stats.get(
                                "confirmed_event_count",
                                0,
                            ),
                            "lastReportStatus": stats.get(
                                "last_report_status",
                                "none",
                            ),
                            "lastClipStatus": stats.get(
                                "last_clip_status",
                                "none",
                            ),
                            "lastClipError": stats.get("last_clip_error"),
                            "lastReportEventId": stats.get(
                                "last_report_event_id",
                            ),
                            "lastReportError": stats.get(
                                "last_report_error",
                            ),
                        }
                        for camera_id, stats in frame_stats.items()
                    ],
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
        captured_at = self.headers.get("X-YELO-Captured-At", "").strip()
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
            result = process_frame(
                camera,
                token,
                frame,
                captured_at or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            )
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
