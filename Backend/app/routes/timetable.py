from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.config.database import get_db
from app.middleware.auth import get_current_admin
from app.models.admin import Admin
from app.models.timetable import TimetableSlot
from app.models.subject import Subject
from app.models.attendance_session import AttendanceSession

router = APIRouter(prefix="/api/timetable", tags=["Timetable"])

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def _slot_status(start: str, end: str, current: str) -> str:
    if current < start:
        return "upcoming"
    if start <= current < end:
        return "ongoing"
    return "completed"


@router.get("/")
async def get_full_timetable(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return the full weekly timetable grouped by day."""
    rows = (
        await db.execute(
            select(TimetableSlot, Subject)
            .join(Subject, TimetableSlot.subject_id == Subject.id)
            .filter(TimetableSlot.is_active == True)
            .order_by(TimetableSlot.day_of_week, TimetableSlot.start_time)
        )
    ).all()

    week: dict[int, list] = {i: [] for i in range(6)}
    for slot, subject in rows:
        week[slot.day_of_week].append(
            {
                "id": slot.id,
                "subject_id": slot.subject_id,
                "subject_name": subject.subject_name,
                "faculty_name": subject.faculty_name,
                "semester": subject.semester,
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "room": slot.room,
            }
        )

    return {
        "success": True,
        "data": [
            {"day": i, "day_name": DAY_NAMES[i], "slots": week[i]}
            for i in range(6)
        ],
    }


@router.get("/today")
async def get_today_schedule(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return today's timetable with live status and session info."""
    now = datetime.now()
    dow = now.weekday()
    today = now.strftime("%Y-%m-%d")
    cur = now.strftime("%H:%M")

    if dow > 5:
        return {"success": True, "day": "Sunday", "date": today, "data": []}

    rows = (
        await db.execute(
            select(TimetableSlot, Subject)
            .join(Subject, TimetableSlot.subject_id == Subject.id)
            .filter(
                and_(
                    TimetableSlot.day_of_week == dow,
                    TimetableSlot.is_active == True,
                )
            )
            .order_by(TimetableSlot.start_time)
        )
    ).all()

    # Active sessions keyed by subject_id
    active_map: dict[int, int] = {}
    sess_rows = (
        await db.execute(
            select(AttendanceSession).filter(
                and_(
                    AttendanceSession.date == today,
                    AttendanceSession.active == True,
                )
            )
        )
    ).scalars().all()
    for s in sess_rows:
        active_map[s.subject_id] = s.id

    slots = []
    for slot, subject in rows:
        slots.append(
            {
                "id": slot.id,
                "subject_id": slot.subject_id,
                "subject_name": subject.subject_name,
                "faculty_name": subject.faculty_name,
                "semester": subject.semester,
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "room": slot.room,
                "status": _slot_status(slot.start_time, slot.end_time, cur),
                "session_id": active_map.get(slot.subject_id),
                "session_active": slot.subject_id in active_map,
            }
        )

    return {
        "success": True,
        "day": DAY_NAMES[dow],
        "date": today,
        "current_time": cur,
        "data": slots,
    }
