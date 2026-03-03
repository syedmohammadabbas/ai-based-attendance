import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.config.database import get_db
from app.middleware.auth import get_current_admin
from app.models.admin import Admin
from app.models.student import Student
from app.models.face_encoding import FaceEncoding
from app.models.attendance_session import AttendanceSession
from app.models.timetable import TimetableSlot
from app.models.subject import Subject
from app.services.face_service import extract_encoding, recognize_face

router = APIRouter(prefix="/api/face", tags=["Face Recognition"])

# ── In-memory encoding cache ──────────────────────────────────────────────────
_cache: list[tuple[int, list[float]]] = []
_cache_dirty: bool = True


def _invalidate_cache():
    global _cache_dirty
    _cache_dirty = True


async def _get_cache(db: AsyncSession) -> list[tuple[int, list[float]]]:
    global _cache, _cache_dirty
    if _cache_dirty:
        result = await db.execute(select(FaceEncoding))
        rows   = result.scalars().all()
        _cache = [(r.student_id, json.loads(r.encoding)) for r in rows]
        _cache_dirty = False
    return _cache


# ── Register face ─────────────────────────────────────────────────────────────
@router.post("/register/{student_id}", status_code=200)
async def register_face(
    student_id: int = Path(..., ge=1),
    image: UploadFile = File(..., description="Clear front-facing photo (JPEG/PNG)"),
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    stu_result = await db.execute(select(Student).filter(Student.id == student_id))
    student = stu_result.scalar_one_or_none()
    if not student:
        raise HTTPException(404, "Student not found.")

    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(400, "Empty image file.")

    encoding = extract_encoding(image_bytes)
    if encoding is None:
        raise HTTPException(400, "No face detected. Please upload a clear front-facing photo.")

    enc_result = await db.execute(
        select(FaceEncoding).filter(FaceEncoding.student_id == student_id)
    )
    existing = enc_result.scalar_one_or_none()

    if existing:
        existing.encoding = json.dumps(encoding)
    else:
        db.add(FaceEncoding(student_id=student_id, encoding=json.dumps(encoding)))

    await db.commit()
    _invalidate_cache()

    return {
        "success": True,
        "message": f"Face registered successfully for {student.name}.",
        "student": {"id": student.id, "name": student.name, "roll_no": student.roll_no},
    }


# ── Recognize face ────────────────────────────────────────────────────────────
@router.post("/recognize", status_code=200)
async def recognize(
    image: UploadFile = File(..., description="Webcam frame (JPEG/PNG)"),
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(400, "Empty image.")

    known = await _get_cache(db)
    if not known:
        raise HTTPException(404, "No faces registered yet. Register students first.")

    match = recognize_face(image_bytes, known)
    if match is None:
        return {"success": False, "message": "No match found.", "student": None}

    stu_result = await db.execute(
        select(Student).filter(Student.id == match["student_id"])
    )
    student = stu_result.scalar_one_or_none()
    if not student:
        return {"success": False, "message": "Matched student not found.", "student": None}

    return {
        "success": True,
        "message": f"Recognized: {student.name}",
        "confidence": match["confidence"],
        "student": {
            "id": student.id,
            "name": student.name,
            "roll_no": student.roll_no,
            "department": student.department,
        },
    }


# ── List registered faces ─────────────────────────────────────────────────────
@router.get("/registered", status_code=200)
async def list_registered(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    # Explicit JOIN — avoids async lazy-load (MissingGreenlet error)
    rows = (
        await db.execute(
            select(FaceEncoding, Student).join(
                Student, FaceEncoding.student_id == Student.id
            )
        )
    ).all()

    return {
        "success": True,
        "total": len(rows),
        "data": [
            {
                "student_id": fe.student_id,
                "name": stu.name,
                "roll_no": stu.roll_no,
                "department": stu.department,
                "registered_at": fe.created_at.isoformat() if fe.created_at else None,
            }
            for fe, stu in rows
        ],
    }


# ── Delete face ────────────────────────────────────────────────────────────────
@router.delete("/register/{student_id}", status_code=200)
async def delete_face(
    student_id: int = Path(..., ge=1),
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    enc_result = await db.execute(
        select(FaceEncoding).filter(FaceEncoding.student_id == student_id)
    )
    existing = enc_result.scalar_one_or_none()
    if not existing:
        raise HTTPException(404, "No face registered for this student.")

    await db.delete(existing)
    await db.commit()
    _invalidate_cache()
    return {"success": True, "message": "Face data deleted."}


# ── Current active session (auto-select subject in Face Attendance) ───────────
@router.get("/current-session", status_code=200)
async def current_session(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the ongoing session / timetable slot so the frontend can
    automatically pre-select the correct subject.
    Priority: active DB session > current timetable slot.
    """
    now   = datetime.now()
    today = now.strftime("%Y-%m-%d")
    cur   = now.strftime("%H:%M")
    dow   = now.weekday()

    # 1. Active attendance session right now
    sess_rows = (
        await db.execute(
            select(AttendanceSession, Subject)
            .join(Subject, AttendanceSession.subject_id == Subject.id)
            .filter(
                and_(
                    AttendanceSession.date == today,
                    AttendanceSession.active == True,
                )
            )
        )
    ).all()

    if sess_rows:
        sess, subj = sess_rows[0]
        return {
            "success": True,
            "session": {
                "session_id": sess.id,
                "subject_id": subj.id,
                "subject_name": subj.subject_name,
                "faculty_name": subj.faculty_name,
                "semester": subj.semester,
                "source": "active_session",
            },
        }

    # 2. Timetable slot that should be running right now
    if dow < 6:
        slot_rows = (
            await db.execute(
                select(TimetableSlot, Subject)
                .join(Subject, TimetableSlot.subject_id == Subject.id)
                .filter(
                    and_(
                        TimetableSlot.day_of_week == dow,
                        TimetableSlot.is_active == True,
                        TimetableSlot.start_time <= cur,
                        TimetableSlot.end_time > cur,
                    )
                )
            )
        ).all()

        if slot_rows:
            slot, subj = slot_rows[0]
            return {
                "success": True,
                "session": {
                    "session_id": None,
                    "subject_id": subj.id,
                    "subject_name": subj.subject_name,
                    "faculty_name": subj.faculty_name,
                    "semester": subj.semester,
                    "source": "timetable",
                },
            }

    return {"success": True, "session": None}
