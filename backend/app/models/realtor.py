from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Realtor(Base):
    __tablename__ = "realtors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    verification_status = Column(String(50), default="pending")
    commission_model = Column(String(255), nullable=True)
    
    # New Onboarding Fields
    social_security = Column(String(100), nullable=True)
    license_number = Column(String(100), nullable=True) # CRECI equivalent
    mls_id = Column(String(100), nullable=True)
    payment_account = Column(String(255), nullable=True) # Bank, PayPal, etc.
    rejection_reason = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # We can link specifically to a user login account if required
    user = relationship("User", back_populates="realtor_profile")
