from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

# ── Many-to-Many association table: User ↔ Company ──
user_company_links = Table(
    'user_company_links',
    Base.metadata,
    Column('user_id',    Integer, ForeignKey('users.id',    ondelete='CASCADE'), primary_key=True),
    Column('company_id', Integer, ForeignKey('companies.id', ondelete='CASCADE'), primary_key=True),
    Column('role',       String(50), nullable=True),
    extend_existing=True,
)

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    address = Column(Text, nullable=True)
    contact = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    # foreign_keys is required because User also has active_company_id → companies.id
    owner = relationship("User", foreign_keys=[user_id], back_populates="companies")
    lists = relationship("ClientList", back_populates="company", cascade="all, delete-orphan")
    notes = relationship("ClientNote", back_populates="company", cascade="all, delete-orphan")
    attachments = relationship("ClientAttachment", back_populates="company", cascade="all, delete-orphan")

    # Many-to-many: all users (managers/agents) linked to this company
    members = relationship("User", secondary="user_company_links", back_populates="linked_companies")
