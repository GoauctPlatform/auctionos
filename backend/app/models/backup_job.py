from sqlalchemy import Column, Integer, String, DateTime, Enum, BigInteger, Text
from sqlalchemy.sql import func
from app.db.base_class import Base

class BackupJob(Base):
    __tablename__ = "backup_jobs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(1024), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=True)
    status = Column(String(50), default="pending", nullable=False)  # pending, running, success, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
