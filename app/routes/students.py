from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from app.models.student import Student
from app.models.admin import Admin
from app.schemas.schemas import StudentCreate, StudentResponse
from app.middleware.auth import get_current_admin
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, func
from app.config.database import get_db

router = APIRouter(prefix="/api/students", tags=["Students"])


@router.post("/add", status_code=201)
async def add_student(data: StudentCreate, admin: Admin = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    # Check duplicates
    result = await db.execute(
        select(Student).filter(
            or_(Student.email == data.email, Student.roll_no == data.roll_no)
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=409, detail="Student with this email or roll number already exists.")

    student = Student(
        name=data.name,
        roll_no=data.roll_no,
        department=data.department,
        email=data.email,
        password=Student.hash_password(data.password),
        parent_email=data.parent_email,
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)

    return {
        "success": True,
        "message": "Student added successfully.",
        "data": StudentResponse(
            id=student.id,
            name=student.name,
            roll_no=student.roll_no,
            department=student.department,
            email=student.email,
            parent_email=student.parent_email,
            is_active=student.is_active,
        ).model_dump(),
    }


@router.get("/")
async def get_students(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    department: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query = select(Student).filter(Student.is_active == True)
    
    if department:
        query = query.filter(Student.department == department)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Student.name.ilike(search_pattern),
                Student.roll_no.ilike(search_pattern)
            )
        )

    # Count query
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Data query
    skip = (page - 1) * limit
    query = query.order_by(Student.roll_no.asc()).offset(skip).limit(limit)
    result = await db.execute(query)
    students = result.scalars().all()

    return {
        "success": True,
        "total": total,
        "page": page,
        "pages": -(-total // limit),  # ceiling division
        "data": [
            {
                "id": s.id,
                "name": s.name,
                "roll_no": s.roll_no,
                "department": s.department,
                "email": s.email,
                "parent_email": s.parent_email,
                "is_active": s.is_active,
            }
            for s in students
        ],
    }


@router.get("/{student_id}")
async def get_student_by_id(student_id: int, admin: Admin = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Student).filter(Student.id == student_id))
    student = result.scalar_one_or_none()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    return {
        "success": True,
        "data": {
            "id": student.id,
            "name": student.name,
            "roll_no": student.roll_no,
            "department": student.department,
            "email": student.email,
            "parent_email": student.parent_email,
            "is_active": student.is_active,
        },
    }
