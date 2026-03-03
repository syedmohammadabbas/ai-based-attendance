"""
Seed a realistic timetable for all 30 subjects.
Dynamically queries subject IDs so it works regardless of sequence values.

Scheduling rules:
  • Odd semesters (1,3,5,7) → Mon / Wed / Fri  (dow 0,2,4)
  • Even semesters (2,4,6,8) → Tue / Thu / Sat  (dow 1,3,5)
  • Within a semester, subjects occupy distinct time slots (no conflicts)
  • Across semesters, overlaps are fine (different student groups)
  • Each subject meets 3 days per week, 1 hour per session

Run from project root:
  python seed_timetable.py
"""

import asyncio
from sqlalchemy import text, select
from app.config.database import AsyncSessionLocal, connect_db
from app.models.timetable import TimetableSlot
from app.models.subject import Subject

# Position 0-based within the 30-subject ordered list → schedule config
# (offset_from_first_id, days, start_time, end_time, room)
SCHEDULE_TEMPLATE = [
    # ── Semester 1 — Mon / Wed / Fri ──────────────────────────────
    (0,  [0, 2, 4], "09:00", "10:00", "Room 101"),
    (1,  [0, 2, 4], "10:00", "11:00", "Room 101"),
    (2,  [0, 2, 4], "11:00", "12:00", "Room 101"),
    (3,  [0, 2, 4], "14:00", "15:00", "Room 101"),

    # ── Semester 2 — Tue / Thu / Sat ──────────────────────────────
    (4,  [1, 3, 5], "09:00", "10:00", "Room 102"),
    (5,  [1, 3, 5], "10:00", "11:00", "Room 102"),
    (6,  [1, 3, 5], "11:00", "12:00", "Room 102"),
    (7,  [1, 3, 5], "14:00", "15:00", "Room 102"),

    # ── Semester 3 — Mon / Wed / Fri ──────────────────────────────
    (8,  [0, 2, 4], "09:00", "10:00", "Room 103"),
    (9,  [0, 2, 4], "10:00", "11:00", "Room 103"),
    (10, [0, 2, 4], "15:00", "16:00", "Room 103"),
    (11, [0, 2, 4], "16:00", "17:00", "Room 103"),

    # ── Semester 4 — Tue / Thu / Sat ──────────────────────────────
    (12, [1, 3, 5], "09:00", "10:00", "Room 201"),
    (13, [1, 3, 5], "10:00", "11:00", "Room 201"),
    (14, [1, 3, 5], "15:00", "16:00", "Room 201"),
    (15, [1, 3, 5], "16:00", "17:00", "Room 201"),

    # ── Semester 5 — Mon / Wed / Fri ──────────────────────────────
    (16, [0, 2, 4], "11:00", "12:00", "Room 202"),
    (17, [0, 2, 4], "12:00", "13:00", "Room 202"),
    (18, [0, 2, 4], "14:00", "15:00", "Room 202"),
    (19, [0, 2, 4], "15:00", "16:00", "Room 202"),

    # ── Semester 6 — Tue / Thu / Sat ──────────────────────────────
    (20, [1, 3, 5], "11:00", "12:00", "Lab A"),
    (21, [1, 3, 5], "12:00", "13:00", "Lab A"),
    (22, [1, 3, 5], "14:00", "15:00", "Lab A"),
    (23, [1, 3, 5], "15:00", "16:00", "Lab A"),

    # ── Semester 7 — Mon / Wed / Fri ──────────────────────────────
    (24, [0, 2, 4], "09:00", "10:00", "Lab B"),
    (25, [0, 2, 4], "12:00", "13:00", "Lab B"),
    (26, [0, 2, 4], "14:00", "15:00", "Lab B"),
    (27, [0, 2, 4], "16:00", "17:00", "Lab B"),

    # ── Semester 8 — Tue / Thu / Sat ──────────────────────────────
    (28, [1, 3, 5], "09:00", "11:00", "Seminar Hall"),  # 2-hr project slot
    (29, [1, 3, 5], "14:00", "16:00", "Seminar Hall"),  # 2-hr project slot
]


async def seed():
    await connect_db()
    async with AsyncSessionLocal() as db:
        # Fetch subject IDs in insertion order
        res = await db.execute(select(Subject.id).order_by(Subject.id))
        subject_ids = [row[0] for row in res.all()]

        if len(subject_ids) < 30:
            print(f"❌  Only {len(subject_ids)} subjects found. Run seed.py first.")
            return

        # Clear existing timetable
        await db.execute(text("DELETE FROM timetable_slots"))
        await db.commit()

        rows: list[TimetableSlot] = []
        for offset, days, start, end, room in SCHEDULE_TEMPLATE:
            real_id = subject_ids[offset]
            for day in days:
                rows.append(
                    TimetableSlot(
                        subject_id=real_id,
                        day_of_week=day,
                        start_time=start,
                        end_time=end,
                        room=room,
                        is_active=True,
                    )
                )

        db.add_all(rows)
        await db.commit()
        print(f"✅  Seeded {len(rows)} timetable slots for {len(SCHEDULE_TEMPLATE)} subjects.")


if __name__ == "__main__":
    asyncio.run(seed())
