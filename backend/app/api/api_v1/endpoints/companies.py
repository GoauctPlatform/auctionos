from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from sqlalchemy import text
from app.services.activity import log_activity

router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class CompanyCreate(BaseModel):
    name: str
    address: Optional[str] = None
    contact: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact: Optional[str] = None


class CompanyOut(BaseModel):
    id: int
    user_id: int
    name: str
    address: Optional[str] = None
    contact: Optional[str] = None
    is_active: bool = False

    class Config:
        from_attributes = True


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/", response_model=List[CompanyOut])
def list_companies(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Lists all companies owned by the current user."""
    rows = db.execute(
        text("""
            SELECT id, user_id, name, address, contact,
                   (id = :active_id) AS is_active
            FROM companies
            WHERE user_id = :uid
            ORDER BY name ASC
        """),
        {"uid": current_user.id, "active_id": current_user.active_company_id or -1}
    ).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Creates a new company for the current user."""
    if current_user.role not in ["client", "admin", "superuser"]:
        raise HTTPException(status_code=403, detail="Only clients can create companies.")
    
    # Trial Limit: 1 Company
    if current_user.subscription_tier == "trial":
        count = db.execute(text("SELECT COUNT(*) FROM companies WHERE user_id = :uid"), {"uid": current_user.id}).scalar()
        if count >= 1:
            raise HTTPException(
                status_code=403, 
                detail="Trial accounts are limited to 1 company. Upgrade to Pro for unlimited companies."
            )
    row = db.execute(
        text("""
            INSERT INTO companies (user_id, name, address, contact)
            VALUES (:uid, :name, :address, :contact)
            RETURNING id, user_id, name, address, contact
        """),
        {
            "uid": current_user.id,
            "name": payload.name,
            "address": payload.address,
            "contact": payload.contact,
        }
    ).fetchone()
    db.commit()

    company = dict(row._mapping)

    # If this is the first company → auto-select it as active
    if current_user.active_company_id is None:
        db.execute(
            text("UPDATE users SET active_company_id = :cid WHERE id = :uid"),
            {"cid": company["id"], "uid": current_user.id}
        )
        db.commit()
        company["is_active"] = True
    else:
        company["is_active"] = False

    log_activity(db, current_user.id, "create_company", "Company", company["id"], {"name": company["name"]})

    return company


@router.put("/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: int,
    payload: CompanyUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Updates a company. Only the owning user can update."""
    existing = db.execute(
        text("SELECT id FROM companies WHERE id = :cid AND user_id = :uid"),
        {"cid": company_id, "uid": current_user.id}
    ).fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Company not found or access denied.")

    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update.")

    set_clause = ", ".join([f"{k} = :{k}" for k in updates.keys()])
    updates["cid"] = company_id
    db.execute(text(f"UPDATE companies SET {set_clause} WHERE id = :cid"), updates)
    db.commit()

    row = db.execute(
        text("""
            SELECT id, user_id, name, address, contact,
                   (id = :active_id) AS is_active
            FROM companies WHERE id = :cid
        """),
        {"cid": company_id, "active_id": current_user.active_company_id or -1}
    ).fetchone()

    log_activity(db, current_user.id, "update_company", "Company", company_id, {"updates": list(updates.keys())})

    return dict(row._mapping)


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> None:
    """Deletes a company. Also clears active_company_id if it was the active one."""
    existing = db.execute(
        text("SELECT id FROM companies WHERE id = :cid AND user_id = :uid"),
        {"cid": company_id, "uid": current_user.id}
    ).fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Company not found or access denied.")

    # If deleting the active company → reset user's active_company_id
    if current_user.active_company_id == company_id:
        db.execute(
            text("UPDATE users SET active_company_id = NULL WHERE id = :uid"),
            {"uid": current_user.id}
        )

    # Unlink lists that belonged to this company
    db.execute(
        text("UPDATE client_lists SET company_id = NULL WHERE company_id = :cid"),
        {"cid": company_id}
    )

    db.execute(text("DELETE FROM companies WHERE id = :cid"), {"cid": company_id})
    db.commit()

    log_activity(db, current_user.id, "delete_company", "Company", company_id)


@router.post("/{company_id}/select", response_model=dict)
def select_active_company(
    company_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Sets the active company for the user (persistent — stored in DB)."""
    existing = db.execute(
        text("SELECT id, name FROM companies WHERE id = :cid AND user_id = :uid"),
        {"cid": company_id, "uid": current_user.id}
    ).fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Company not found or access denied.")

    db.execute(
        text("UPDATE users SET active_company_id = :cid WHERE id = :uid"),
        {"cid": company_id, "uid": current_user.id}
    )
    db.commit()
    return {"active_company_id": company_id, "active_company_name": existing[1]}
