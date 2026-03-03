"""
Automatic session scheduler.
Runs a job every minute to start / stop attendance sessions
based on the timetable_slots table.
"""
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import and_, select

from app.config.database import AsyncSessionLocal
from app.models.attendance_session import AttendanceSession
from app.models.timetable import TimetableSlot

log = logging.getLogger("scheduler")
scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")


async def _auto_sessions() -> None:
    now = datetime.now()
    dow = now.weekday()          # 0=Mon … 5=Sat, 6=Sun
    if dow > 5:                  # skip Sunday
        return

    today = now.strftime("%Y-%m-%d")
    cur = now.strftime("%H:%M")

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(TimetableSlot).filter(
                and_(TimetableSlot.day_of_week == dow, TimetableSlot.is_active == True)
            )
        )
        slots = result.scalars().all()

        for slot in slots:
            # ── Auto-start ──────────────────────────────────────────────
            if slot.start_time == cur:
                existing = (
                    await db.execute(
                        select(AttendanceSession).filter(
                            and_(
                                AttendanceSession.subject_id == slot.subject_id,
                                AttendanceSession.date == today,
                                AttendanceSession.active == True,
                            )
                        )
                    )
                ).scalar_one_or_none()

                if not existing:
                    db.add(
                        AttendanceSession(
                            subject_id=slot.subject_id,
                            started_by=None,   # auto-triggered
                            date=today,
                            active=True,
                        )
                    )
                    log.info("Auto-STARTED session  subject_id=%s  %s", slot.subject_id, cur)

            # ── Auto-stop ───────────────────────────────────────────────
            if slot.end_time == cur:
                active = (
                    await db.execute(
                        select(AttendanceSession).filter(
                            and_(
                                AttendanceSession.subject_id == slot.subject_id,
                                AttendanceSession.date == today,
                                AttendanceSession.active == True,
                            )
                        )
                    )
                ).scalar_one_or_none()

                if active:
                    active.active = False
                    active.end_time = datetime.utcnow()
                    log.info("Auto-STOPPED  session  subject_id=%s  %s", slot.subject_id, cur)

        await db.commit()


def start_scheduler() -> None:
    scheduler.add_job(
        _auto_sessions,
        trigger="cron",
        minute="*",   # fires at :00 of every minute
        id="auto_sessions",
        replace_existing=True,
        misfire_grace_time=30,
    )
    scheduler.start()
    log.info("Timetable scheduler started.")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        log.info("Timetable scheduler stopped.")
