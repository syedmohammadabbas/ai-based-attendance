from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.config.database import Base


class TimetableSlot(Base):
    __tablename__ = "timetable_slots"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False, index=True)  # 0=Mon … 5=Sat
    start_time = Column(String(5), nullable=False)             # "HH:MM"
    end_time = Column(String(5), nullable=False)               # "HH:MM"
    room = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)

    subject = relationship("Subject")
