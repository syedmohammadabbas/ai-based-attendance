from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.config.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    time = Column(String, nullable=False)  # HH:MM:SS
    status = Column(String, nullable=False)  # 'present' or 'absent'

    # AI Integration Point
    confidence_score = Column(Float, nullable=True)
    marked_by = Column(String, default="manual")  # 'manual' or 'ai'

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relations
    student = relationship("Student")
    subject = relationship("Subject")
    session = relationship("AttendanceSession")

    # Add a unique constraint to prevent double marking students per subject per date is handled via queries usually, but can be added here
    # __table_args__ = (UniqueConstraint('student_id', 'subject_id', 'date', name='uq_student_subject_date'),)
