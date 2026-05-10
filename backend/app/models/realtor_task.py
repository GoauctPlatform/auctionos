from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey
)
from sqlalchemy.sql import func
from app.db.base_class import Base


class PropertyExport(Base):
    """Propriedade exportada por um investidor para ser visível aos consultores."""
    __tablename__ = "property_exports"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("property_details.id", ondelete="CASCADE"), nullable=False, index=True)
    investor_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_name = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    contact_email = Column(String(255), nullable=True)
    requested_sale_price = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    exported_at = Column(DateTime(timezone=True), server_default=func.now())


class RealtorTask(Base):
    """Task de due diligence criada por um investidor, executável por um consultor."""
    __tablename__ = "realtor_tasks"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("property_details.id", ondelete="CASCADE"), nullable=False, index=True)
    investor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    realtor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Task details
    task_type = Column(String(50), default="photo_verification")  # 'photo_verification', etc.
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Location target
    address = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    geo_radius_meters = Column(Integer, default=50)

    # Pricing: 100 points = $1.00; min 500 points (3 photos = $5)
    min_photos = Column(Integer, default=3)   # 3 to 10
    max_photos = Column(Integer, default=10)
    reward_points = Column(Integer, default=500)  # investor sets this

    # Status lifecycle: open → claimed → submitted → approved | rejected
    status = Column(String(50), default="open", index=True)

    # Timestamps
    deadline = Column(DateTime(timezone=True), nullable=True)   # set by realtor when claiming
    claimed_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TaskSubmission(Base):
    """Evidência enviada pelo consultor para uma task (fotos + GPS)."""
    __tablename__ = "task_submissions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("realtor_tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    realtor_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Geolocation validation
    submission_lat = Column(Float, nullable=True)
    submission_lng = Column(Float, nullable=True)
    distance_meters = Column(Float, nullable=True)   # calculated distance to task target
    geo_validated = Column(Boolean, default=False)   # within the 50m radius

    # File info (stored path or URL)
    file_path = Column(String(2048), nullable=True)
    file_type = Column(String(50), nullable=True)    # 'image/jpeg', 'image/png'
    photo_count = Column(Integer, default=1)          # how many photos in this submission

    notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    # Hybrid review: auto-approved if geo_validated, investor can contest
    review_status = Column(String(50), default="pending")   # pending, approved, rejected
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)


class RealtorCommission(Base):
    """Registro de pontos/comissões ganhos ou sacados pelo consultor."""
    __tablename__ = "realtor_commissions"

    id = Column(Integer, primary_key=True, index=True)
    realtor_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("realtor_tasks.id", ondelete="SET NULL"), nullable=True)

    points = Column(Integer, nullable=False)           # positive = earned, negative = withdrawn
    usd_value = Column(Float, nullable=True)           # points / 100
    type = Column(String(50), nullable=False)          # 'earned', 'withdrawn', 'refunded'
    status = Column(String(50), default="available")  # available, pending_withdrawal, paid

    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SupportTicket(Base):
    """Ticket de suporte criado por investidor ou consultor, gerenciado pelo admin."""
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    task_id = Column(Integer, ForeignKey("realtor_tasks.id", ondelete="SET NULL"), nullable=True)

    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    ticket_type = Column(String(50), default="general")  # 'bug', 'task_conflict', 'payment', 'general'

    status = Column(String(50), default="open")   # open, in_progress, resolved, closed
    admin_response = Column(Text, nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
