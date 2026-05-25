from typing import Optional, List
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False   # Optional prevents 422 on missing field
    full_name: Optional[str] = None


class UserCreate(BaseModel):
    """
    Schema used for public registration (/auth/register).
    Declared standalone to avoid Pydantic v1/v2 inheritance quirks.
    """
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False
    role: Optional[str] = "client"
    company_id: Optional[int] = None
    company_ids: Optional[List[int]] = None   # Multi-company: primary + additional companies
    newsletter: Optional[bool] = False


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    password: Optional[str] = None
    role: Optional[str] = None


class User(BaseModel):
    id: int
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False
    role: Optional[str] = "client"
    active_company_id: Optional[int] = None
    company_id: Optional[int] = None
    subscription_tier: Optional[str] = "trial"
    is_verified: bool = False
    property_searches_used: Optional[int] = 0
    linked_company_ids: Optional[List[int]] = []  # All company IDs this user belongs to
    terms_accepted: Optional[bool] = False
    newsletter_opt_in: Optional[bool] = False

    class Config:
        from_attributes = True
