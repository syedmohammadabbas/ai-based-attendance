import asyncio
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from io import BytesIO

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func

from app.models.admin import Admin
from app.models.student import Student
from app.models.subject import Subject
from app.models.attendance_session import AttendanceSession
from app.models.attendance import Attendance
from app.schemas.schemas import SessionStart, SessionStop, AttendanceMark
from app.middleware.auth import get_current_admin
from app.services.email_service import send_absence_notification
from app.services.excel_service import generate_attendance_excel
from app.config.database import get_db

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


def _today() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


def _now_time() -> str:
    return datetime.utcnow().strftime("%H:%M:%S")


# ──────────────────────────────────────
#  Sessions
# ──────────────────────────────────────

@router.post("/start", status_code=201)
async def start_session(data: SessionStart, admin: Admin = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Subject).filter(Subject.id == data.subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")

    res_session = await db.execute(
        select(AttendanceSession).filter(
            and_(
                AttendanceSession.subject_id == data.subject_id,
                AttendanceSession.date == _today(),
                AttendanceSession.active == True,
            )
        )
    )
    existing = res_session.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Active session already exists for this subject today.")

    session = AttendanceSession(
        subject_id=data.subject_id,
        started_by=admin.id,
        date=_today(),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "success": True,
        "message": "Attendance session started.",
        "data": {
            "id": session.id,
            "subject_id": session.subject_id,
            "date": session.date,
            "start_time": session.start_time.isoformat(),
            "active": session.active,
        },
    }


@router.post("/stop")
async def stop_session(data: SessionStop, admin: Admin = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AttendanceSession).filter(AttendanceSession.id == data.session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not session.active:
        raise HTTPException(status_code=400, detail="Session is already stopped.")

    session.active = False
    session.end_time = datetime.utcnow()
    await db.commit()
    await db.refresh(session)

    return {
        "success": True,
        "message": "Attendance session stopped.",
        "data": {
            "id": session.id,
            "subject_id": session.subject_id,
            "date": session.date,
            "end_time": session.end_time.isoformat() if session.end_time else None,
            "active": session.active,
        },
    }


# ──────────────────────────────────────
#  Mark Attendance (AI integration point)
# ──────────────────────────────────────

@router.post("/mark", status_code=201)
async def mark_attendance(data: AttendanceMark, db: AsyncSession = Depends(get_db)):
    """Public endpoint — will be called by face recognition module in the future."""

    # 1. Validate student
    res_student = await db.execute(select(Student).filter(Student.id == data.student_id))
    student = res_student.scalar_one_or_none()
    if not student or not student.is_active:
        raise HTTPException(status_code=404, detail="Student not found or inactive.")

    # 2. Validate subject
    res_subj = await db.execute(select(Subject).filter(Subject.id == data.subject_id))
    subject = res_subj.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")

    # 3. Check active session
    res_session = await db.execute(
        select(AttendanceSession).filter(
            and_(
                AttendanceSession.subject_id == data.subject_id,
                AttendanceSession.date == _today(),
                AttendanceSession.active == True,
            )
        )
    )
    active_session = res_session.scalar_one_or_none()
    if not active_session:
        raise HTTPException(
            status_code=400,
            detail="No active attendance session for this subject today. Start a session first.",
        )

    # 4. Duplicate check
    res_att = await db.execute(
        select(Attendance).filter(
            and_(
                Attendance.student_id == data.student_id,
                Attendance.subject_id == data.subject_id,
                Attendance.date == _today(),
            )
        )
    )
    existing = res_att.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Attendance already marked for this student today.")

    # 5. Create record
    attendance = Attendance(
        student_id=data.student_id,
        subject_id=data.subject_id,
        session_id=active_session.id,
        date=_today(),
        time=_now_time(),
        status=data.status,
        confidence_score=data.confidence_score,
        marked_by=data.marked_by or "manual",
    )
    db.add(attendance)
    await db.commit()
    await db.refresh(attendance)

    # 6. Send email if absent (non-blocking)
    if data.status == "absent":
        asyncio.create_task(
            send_absence_notification(
                parent_email=student.parent_email,
                student_name=student.name,
                roll_no=student.roll_no,
                subject_name=subject.subject_name,
                date=_today(),
            )
        )

    return {
        "success": True,
        "message": f"Attendance marked as {data.status} for {student.name}.",
        "data": {
            "id": attendance.id,
            "student_id": attendance.student_id,
            "subject_id": attendance.subject_id,
            "date": attendance.date,
            "time": attendance.time,
            "status": attendance.status,
            "confidence_score": attendance.confidence_score,
            "marked_by": attendance.marked_by,
        },
    }


# ──────────────────────────────────────
#  Reports
# ──────────────────────────────────────

@router.get("/today")
async def get_today_attendance(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    subject_id: Optional[int] = None,
):
    query = select(Attendance).filter(Attendance.date == _today()).order_by(Attendance.time.asc())
    if subject_id:
        query = query.filter(Attendance.subject_id == subject_id)

    result = await db.execute(query)
    records = result.scalars().all()

    results = []
    for r in records:
        student = (await db.execute(select(Student).filter(Student.id == r.student_id))).scalar_one_or_none()
        subject = (await db.execute(select(Subject).filter(Subject.id == r.subject_id))).scalar_one_or_none()
        results.append({
            "id": r.id,
            "student": {"id": student.id, "name": student.name, "roll_no": student.roll_no} if student else None,
            "subject": {"id": subject.id, "subject_name": subject.subject_name} if subject else None,
            "date": r.date,
            "time": r.time,
            "status": r.status,
            "confidence_score": r.confidence_score,
            "marked_by": r.marked_by,
        })

    return {"success": True, "date": _today(), "total": len(results), "data": results}


@router.get("/report")
async def get_report(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    subject_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
):
    query = select(Attendance).order_by(Attendance.date.desc())
    if subject_id:
        query = query.filter(Attendance.subject_id == subject_id)
    if status:
        query = query.filter(Attendance.status == status)
    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)

    result = await db.execute(query)
    records = result.scalars().all()

    results = []
    for r in records:
        student = (await db.execute(select(Student).filter(Student.id == r.student_id))).scalar_one_or_none()
        subject = (await db.execute(select(Subject).filter(Subject.id == r.subject_id))).scalar_one_or_none()
        results.append({
            "id": r.id,
            "student": {"id": student.id, "name": student.name, "roll_no": student.roll_no, "department": student.department} if student else None,
            "subject": {"id": subject.id, "subject_name": subject.subject_name, "semester": subject.semester} if subject else None,
            "date": r.date,
            "time": r.time,
            "status": r.status,
        })

    return {
        "success": True,
        "total": len(results),
        "filters": {"subject_id": subject_id, "start_date": start_date, "end_date": end_date, "status": status},
        "data": results,
    }


@router.get("/student/{student_id}")
async def get_student_attendance(student_id: int, admin: Admin = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res_student = await db.execute(select(Student).filter(Student.id == student_id))
    student = res_student.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    query = select(Attendance).filter(Attendance.student_id == student_id).order_by(Attendance.date.desc())
    res_records = await db.execute(query)
    records = res_records.scalars().all()

    # Build per-subject summary
    summary_map = {}
    for r in records:
        key = r.subject_id
        if key not in summary_map:
            subject = (await db.execute(select(Subject).filter(Subject.id == key))).scalar_one_or_none()
            summary_map[key] = {
                "subject_id": key,
                "subject_name": subject.subject_name if subject else "Unknown",
                "total": 0,
                "present": 0,
                "absent": 0,
            }
        summary_map[key]["total"] += 1
        if r.status == "present":
            summary_map[key]["present"] += 1
        else:
            summary_map[key]["absent"] += 1

    summary = []
    for s in summary_map.values():
        pct = round((s["present"] / s["total"]) * 100, 2) if s["total"] > 0 else 0
        summary.append({**s, "percentage": f"{pct}%"})

    return {
        "success": True,
        "student": {"id": student.id, "name": student.name, "roll_no": student.roll_no, "department": student.department},
        "summary": summary,
        "total_records": len(records),
    }


# ──────────────────────────────────────
#  Excel Export
# ──────────────────────────────────────

@router.get("/export/{subject_id}")
async def export_attendance(subject_id: int, admin: Admin = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res_subj = await db.execute(select(Subject).filter(Subject.id == subject_id))
    subject = res_subj.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")

    res_students = await db.execute(select(Student).filter(Student.is_active == True).order_by(Student.roll_no.asc()))
    students = res_students.scalars().all()
    
    res_sessions = await db.execute(select(AttendanceSession).filter(AttendanceSession.subject_id == subject_id))
    sessions = res_sessions.scalars().all()
    total_classes = len(sessions)

    res_records = await db.execute(select(Attendance).filter(Attendance.subject_id == subject_id))
    records = res_records.scalars().all()

    report_data = []
    for s in students:
        student_records = [r for r in records if r.student_id == s.id]
        present = sum(1 for r in student_records if r.status == "present")
        absent = sum(1 for r in student_records if r.status == "absent")
        report_data.append({
            "name": s.name,
            "roll_no": s.roll_no,
            "total": total_classes,
            "present": present,
            "absent": absent,
        })

    excel_bytes = generate_attendance_excel(report_data, subject.subject_name)
    filename = f"attendance_{subject.subject_name.replace(' ', '_')}_{_today()}.xlsx"

    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
