from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.db.base_class import Base

class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    plan_type = Column(String(50), default="trial") # trial, pro, enterprise
    status = Column(String(50), default="active") # active, canceled, expired
    start_date = Column(DateTime(timezone=True), server_default=func.now())
    end_date = Column(DateTime(timezone=True), nullable=True) # Trial normally 7 days
    
    # Usage tracking
    property_views_used = Column(Integer, default=0)
    property_searches_used = Column(Integer, default=0)
    properties_created = Column(Integer, default=0)

class StorageUsage(Base):
    __tablename__ = "storage_usage"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    total_bytes = Column(Integer, default=0)
    last_calculated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
