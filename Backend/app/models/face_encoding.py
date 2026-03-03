from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.config.database import Base


class FaceEncoding(Base):
    __tablename__ = "face_encodings"

    id         = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"),
                        unique=True, nullable=False, index=True)
    encoding   = Column(Text, nullable=False)   # JSON-serialised numpy float array (128-d)
    image_path = Column(String, nullable=True)  # path to stored sample image (optional)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    student = relationship("Student")
