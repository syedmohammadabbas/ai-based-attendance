from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from app.models.subject import Subject
from app.models.admin import Admin
from app.schemas.schemas import SubjectCreate
from app.middleware.auth import get_current_admin
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from app.config.database import get_db

router = APIRouter(prefix="/api/subjects", tags=["Subjects"])


@router.post("/", status_code=201)
async def add_subject(data: SubjectCreate, admin: Admin = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Subject).filter(
            and_(
                Subject.subject_name == data.subject_name,
                Subject.semester == data.semester
            )
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Subject already exists for this semester.")

    subject = Subject(
        subject_name=data.subject_name,
        faculty_name=data.faculty_name,
        semester=data.semester,
    )
    db.add(subject)
    await db.commit()
    await db.refresh(subject)

    return {
        "success": True,
        "message": "Subject added successfully.",
        "data": {
            "id": subject.id,
            "subject_name": subject.subject_name,
            "faculty_name": subject.faculty_name,
            "semester": subject.semester,
            "is_active": subject.is_active,
        },
    }


@router.get("/")
async def get_subjects(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    semester: Optional[str] = None,
):
    query = select(Subject).filter(Subject.is_active == True)
    if semester:
        query = query.filter(Subject.semester == semester)

    query = query.order_by(Subject.semester.asc(), Subject.subject_name.asc())
    result = await db.execute(query)
    subjects = result.scalars().all()

    return {
        "success": True,
        "total": len(subjects),
        "data": [
            {
                "id": s.id,
                "subject_name": s.subject_name,
                "faculty_name": s.faculty_name,
                "semester": s.semester,
                "is_active": s.is_active,
            }
            for s in subjects
        ],
    }
