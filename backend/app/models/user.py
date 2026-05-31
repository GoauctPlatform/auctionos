from sqlalchemy import Boolean, Column, Integer,Text, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean(), default=True)
    is_superuser = Column(Boolean(), default=False)
    role = Column(String(50), default="client")   # 'admin', 'client', 'realtor', 'superuser'
    full_name = Column(String(255), nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(Integer, nullable=True) # unix timestamp
    is_verified = Column(Boolean(), default=False)
    verification_token = Column(String(255), nullable=True)
    terms_accepted = Column(Boolean(), default=False)
    newsletter_opt_in = Column(Boolean(), default=False)
    active_session_id = Column(String(255), nullable=True)

    # ── Billing & Usage ──────────────────────────────────────────────────────
    subscription_tier = Column(String(50), default="trial")  # 'trial', 'pro', 'enterprise'
    property_searches_used = Column(Integer, default=0)

    # ── Empresa ativa (persistente entre sessões) ────────────────────────────
    active_company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── RBAC e Hierarquia ────────────────────────────────────────────────────
    # Persistent company association for RBAC (as opposed to just active session)
    company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    permissions = Column(Text, nullable=True) # JSON structured permissions

    # ── Relacionamentos ──────────────────────────────────────────────────────
    # Usa backref nos modelos secundários → NÃO define back_populates aqui
    # para evitar conflito com os backref definidos naquelas classes.
    # Exceção: Company e Realtor usam back_populates explícito de ambos os lados.

    companies = relationship(
        "Company",
        foreign_keys="Company.user_id",
        back_populates="owner",
        cascade="all, delete-orphan",
    )

    active_company = relationship(
        "Company",
        foreign_keys=[active_company_id],
    )

    # Many-to-many: all companies this user is linked to (as manager/agent)
    linked_companies = relationship(
        "Company",
        secondary="user_company_links",
        back_populates="members",
        lazy="select",
    )

    realtor_profile = relationship(
        "Realtor",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    agent_profile = relationship(
        "AgentDueDiligenceProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    onboarding = relationship(
        "UserOnboarding",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # Os modelos abaixo definem 'backref' próprio → não usar back_populates aqui
    # client_lists       → ClientList.user   (backref)
    # client_notes       → ClientNote.user   (backref)
    # client_attachments → ClientAttachment.user (backref)
    # notifications      → via user_id FK, sem ORM back-ref no modelo Notification
    # activity_logs      → via user_id FK, sem ORM back-ref no modelo ActivityLog
