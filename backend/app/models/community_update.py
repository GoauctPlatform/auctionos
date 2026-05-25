from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.db.base_class import Base

class CommunityUpdate(Base):
    __tablename__ = "community_updates"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(100), nullable=True)
    tag = Column(String(100), nullable=True)
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=True)
    author = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=func.now())
