"""
Face recognition service using face_recognition (dlib ResNet).
"""

import io
import json
import logging
import numpy as np
from PIL import Image

import face_recognition

logger = logging.getLogger(__name__)

# ── Tolerance ────────────────────────────────────────────────────────────────
# Lower = stricter match. 0.5 gives good accuracy with low false-positives.
TOLERANCE = 0.5


def _load_image_bytes(image_bytes: bytes) -> np.ndarray:
    """Convert raw image bytes → RGB numpy array (face_recognition format)."""
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return np.array(pil_img)


def extract_encoding(image_bytes: bytes) -> list[float] | None:
    """
    Detect the largest face in `image_bytes` and return its 128-d encoding.
    Returns None if no face is found.
    """
    img = _load_image_bytes(image_bytes)

    # Use HOG model (fast); switch to "cnn" for GPU accuracy
    locations = face_recognition.face_locations(img, model="hog")
    if not locations:
        return None

    # Pick the largest face (most prominent in frame)
    largest = max(locations, key=lambda loc: (loc[2] - loc[0]) * (loc[1] - loc[3]))
    encodings = face_recognition.face_encodings(img, [largest])
    if not encodings:
        return None

    return encodings[0].tolist()          # numpy → plain Python list for JSON storage


def recognize_face(
    image_bytes: bytes,
    known_encodings: list[tuple[int, list[float]]],  # [(student_id, encoding), ...]
) -> dict | None:
    """
    Compare face in `image_bytes` against all known encodings.
    Returns {student_id, confidence} for best match, or None.
    """
    img = _load_image_bytes(image_bytes)

    locations = face_recognition.face_locations(img, model="hog")
    if not locations:
        return None

    largest = max(locations, key=lambda loc: (loc[2] - loc[0]) * (loc[1] - loc[3]))
    encodings = face_recognition.face_encodings(img, [largest])
    if not encodings:
        return None

    face_enc = encodings[0]

    if not known_encodings:
        return None

    student_ids = [sid for sid, _ in known_encodings]
    enc_matrix  = np.array([enc for _, enc in known_encodings])

    distances    = face_recognition.face_distance(enc_matrix, face_enc)
    best_idx     = int(np.argmin(distances))
    best_dist    = float(distances[best_idx])

    if best_dist > TOLERANCE:
        return None                        # no confident match

    confidence = round((1.0 - best_dist) * 100, 2)   # 0–100 %
    return {"student_id": student_ids[best_idx], "confidence": confidence}
