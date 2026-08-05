from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
import enum
import datetime
from app.db.base_class import Base

class AffiliateStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class ReferralStatus(str, enum.Enum):
    REGISTERED = "registered"
    CONVERTED = "converted"
    CHURNED = "churned"

class ClearanceStatus(str, enum.Enum):
    PENDING = "pending"
    CLEARED = "cleared"
    REFUNDED = "refunded"

class WithdrawalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    REJECTED = "rejected"

class AffiliateProfile(Base):
    __tablename__ = "affiliate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    affiliate_code = Column(String(50), unique=True, index=True, nullable=False)
    status = Column(String(50), default=AffiliateStatus.PENDING)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    terms_accepted = Column(Boolean, default=False)
    terms_accepted_at = Column(DateTime, nullable=True)
    
    # Financials
    total_earnings = Column(Float, default=0.0)
    available_balance = Column(Float, default=0.0)
    
    # Relationships
    user = relationship("User", backref="affiliate_profile")
    referrals = relationship("AffiliateReferral", back_populates="affiliate")
    withdrawals = relationship("AffiliateWithdrawal", back_populates="affiliate")

class AffiliateReferral(Base):
    __tablename__ = "affiliate_referrals"

    id = Column(Integer, primary_key=True, index=True)
    affiliate_id = Column(Integer, ForeignKey("affiliate_profiles.id", ondelete="CASCADE"), nullable=False)
    referred_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), unique=True, nullable=True)
    
    status = Column(String(50), default=ReferralStatus.REGISTERED)
    commission_amount = Column(Float, default=0.0)
    
    # Clearance Period tracking (7 days)
    clearance_status = Column(String(50), default=ClearanceStatus.PENDING)
    clearance_date = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    converted_at = Column(DateTime, nullable=True)
    
    # Relationships
    affiliate = relationship("AffiliateProfile", back_populates="referrals")
    referred_user = relationship("User", foreign_keys=[referred_user_id])

class AffiliateWithdrawal(Base):
    __tablename__ = "affiliate_withdrawals"

    id = Column(Integer, primary_key=True, index=True)
    affiliate_id = Column(Integer, ForeignKey("affiliate_profiles.id", ondelete="CASCADE"), nullable=False)
    
    amount = Column(Float, nullable=False)
    status = Column(String(50), default=WithdrawalStatus.PENDING)
    
    payment_method = Column(String(100), nullable=True) # e.g. "Pix", "PayPal", "Bank Transfer"
    payment_details = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    admin_notes = Column(String(255), nullable=True)
    
    # Relationships
    affiliate = relationship("AffiliateProfile", back_populates="withdrawals")
