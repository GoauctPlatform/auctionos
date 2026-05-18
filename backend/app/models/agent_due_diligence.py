from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class AgentDueDiligenceProfile(Base):
    __tablename__ = "agent_due_diligence_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    coverage_area = Column(String(255), nullable=True)
    coverage_radius_miles = Column(Integer, default=50)
    vehicle_type = Column(String(100), nullable=True)
    
    # New Onboarding Fields
    social_security = Column(String(100), nullable=True)
    payment_account = Column(String(255), nullable=True) # Bank, PayPal, etc.
    rejection_reason = Column(String(500), nullable=True)

    verification_status = Column(String(50), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="agent_profile")
