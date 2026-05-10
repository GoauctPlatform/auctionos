from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class RealtorWallet(Base):
    __tablename__ = "realtor_wallet"

    id = Column(Integer, primary_key=True, index=True)
    realtor_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    balance = Column(Float, default=0.0)
    total_earned = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class WithdrawalRequest(Base):
    __tablename__ = "withdrawal_requests"

    id = Column(Integer, primary_key=True, index=True)
    realtor_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    status = Column(String(50), default="pending") # pending, approved, rejected, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    admin_notes = Column(Text, nullable=True)

class PropertyMediaPurchase(Base):
    __tablename__ = "property_media_purchases"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(String(36), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount_paid = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
