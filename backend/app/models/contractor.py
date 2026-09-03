from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class ContractorProfile(Base):
    __tablename__ = "contractor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    profession = Column(String(255), nullable=True) # e.g., 'HVAC', 'Plumbing', 'General Contractor', 'Landscaping'
    service_area_zipcodes = Column(String(1000), nullable=True) # comma separated zipcodes
    license_number = Column(String(255), nullable=True)
    
    # Document upload / verification
    license_document_url = Column(String(500), nullable=True)
    verification_status = Column(String(50), default="pending") # pending, approved, rejected
    document_verification_date = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="contractor_profile")
