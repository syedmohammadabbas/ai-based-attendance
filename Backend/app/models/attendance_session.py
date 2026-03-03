from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.config.database import Base


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    started_by = Column(Integer, ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    active = Column(Boolean, default=True)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD

    # Relations
    subject = relationship("Subject")
    admin = relationship("Admin")
