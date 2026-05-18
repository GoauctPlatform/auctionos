from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from sqlalchemy import text

router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class ConsultantRegister(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    # Optional: if user already exists, link to their account
    user_id: Optional[int] = None


class RealtorProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    commission_model: Optional[str] = None  # e.g. "5%", "negotiable"


class ConsultantOut(BaseModel):
    id: int
    user_id: Optional[int]
    name: str
    email: str
    phone: Optional[str]
    verification_status: str
    commission_model: Optional[str]
    rejection_reason: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Public Registration ──────────────────────────────────────────────────────

@router.post("/register", response_model=ConsultantOut, status_code=status.HTTP_201_CREATED)
def register_realtor(payload: ConsultantRegister, db: Session = Depends(deps.get_db)) -> Any:
    """
    Public endpoint — no authentication required.
    Partners/realtors fill this form on the Landing Page.
    Creates a realtor record with 'pending' verification status.
    """
    # Check if email already registered
    existing = db.execute(
        text("SELECT id FROM realtors WHERE email = :email"),
        {"email": payload.email}
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="A realtor with this email already exists.")

    row = db.execute(
        text("""
            INSERT INTO realtors (user_id, name, email, phone, verification_status, commission_model)
            VALUES (:uid, :name, :email, :phone, 'pending', 'negotiable')
            RETURNING id, user_id, name, email, phone, verification_status, commission_model
        """),
        {
            "uid": payload.user_id,
            "name": payload.name,
            "email": payload.email,
            "phone": payload.phone,
        }
    ).fetchone()
    db.commit()
    return dict(row._mapping)


# ─── Authenticated Realtor Endpoints ──────────────────────────────────────

@router.get("/me", response_model=ConsultantOut)
def get_my_realtor_profile(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Returns the realtor profile linked to the current user."""
    row = db.execute(
        text("SELECT * FROM realtors WHERE user_id = :uid"),
        {"uid": current_user.id}
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="No realtor profile found for this user.")
    return dict(row._mapping)


@router.put("/me", response_model=ConsultantOut)
def update_my_realtor_profile(
    payload: RealtorProfileUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Updates the realtor profile of the current user."""
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided.")

    set_clause = ", ".join([f"{k} = :{k}" for k in updates.keys()])
    updates["uid"] = current_user.id
    db.execute(
        text(f"UPDATE realtors SET {set_clause} WHERE user_id = :uid"),
        updates
    )
    db.commit()

    row = db.execute(
        text("SELECT * FROM realtors WHERE user_id = :uid"),
        {"uid": current_user.id}
    ).fetchone()
    return dict(row._mapping)


@router.get("/listings")
def get_realtor_listings(
    state: Optional[str] = None,
    limit: int = 20,
    skip: int = 0,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Returns available properties visible to realtors.
    These are properties available for strategic partnerships and referrals.
    """
    state_clause = "AND LOWER(p.state) = LOWER(:state)" if state else ""
    params: dict = {"limit": limit, "skip": skip}
    if state:
        params["state"] = state

    rows = db.execute(
        text(f"""
            SELECT
                p.id,
                p.parcel_id,
                p.address,
                p.county,
                p.state,
                p.property_type,
                p.assessed_value,
                p.amount_due,
                p.lot_acres,
                p.owner_name,
                p.availability_status
            FROM property_details p
            WHERE LOWER(p.availability_status) = 'available'
              {state_clause}
            ORDER BY p.assessed_value DESC NULLS LAST
            LIMIT :limit OFFSET :skip
        """),
        params
    ).fetchall()

    return {
        "items": [dict(r._mapping) for r in rows],
        "total": len(rows),
        "state": state,
    }
