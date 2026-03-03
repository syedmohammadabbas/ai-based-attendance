from pydantic import BaseModel, EmailStr, Field
from typing import Optional


# --- Auth Schemas ---
class AdminRegister(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AdminResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str


class TokenResponse(BaseModel):
    success: bool = True
    message: str
    token: str
    data: AdminResponse


# --- Student Schemas ---
class StudentCreate(BaseModel):
    name: str = Field(..., min_length=1)
    roll_no: str = Field(..., min_length=1)
    department: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)
    parent_email: EmailStr


class StudentResponse(BaseModel):
    id: int
    name: str
    roll_no: str
    department: str
    email: str
    parent_email: str
    is_active: bool


# --- Subject Schemas ---
class SubjectCreate(BaseModel):
    subject_name: str = Field(..., min_length=1)
    faculty_name: str = Field(..., min_length=1)
    semester: str = Field(..., min_length=1)


class SubjectResponse(BaseModel):
    id: int
    subject_name: str
    faculty_name: str
    semester: str
    is_active: bool


# --- Attendance Session Schemas ---
class SessionStart(BaseModel):
    subject_id: int


class SessionStop(BaseModel):
    session_id: int


# --- Attendance Marking Schema ---
class AttendanceMark(BaseModel):
    student_id: int
    subject_id: int
    status: str = Field(..., pattern="^(present|absent)$")
    confidence_score: Optional[float] = Field(default=None, ge=0, le=1)
    marked_by: Optional[str] = Field(default="manual", pattern="^(manual|ai)$")


# --- Generic Response ---
class MessageResponse(BaseModel):
    success: bool
    message: str
