from typing import Any, List
from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from pydantic.networks import EmailStr
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.models.activity_log import ActivityLog
from app.models.user import User
from app.schemas.user import User as UserSchema, UserCreate, UserUpdate
from app.core.rbac import allow_managers, allow_admin_only
from app.services.activity import log_activity

router = APIRouter()

@router.get("/", response_model=List[UserSchema])
def read_users(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    return db.query(User).offset(skip).limit(limit).all()

@router.get("/team", response_model=List[UserSchema])
def read_team_users(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(allow_managers),
) -> Any:
    if current_user.role == "client":
        # Include users created by the client OR users belonging to their active company
        return db.query(User).filter(
            (User.created_by_id == current_user.id) | 
            (User.id == current_user.id) |
            (User.company_id == current_user.active_company_id if current_user.active_company_id else False)
        ).all()
    elif current_user.role == "manager":
        return db.query(User).filter(
            (User.company_id == current_user.company_id) | (User.id == current_user.id)
        ).all()
    else:
        return [current_user]

@router.post("/", response_model=UserSchema)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
    current_user: User = Depends(allow_managers),
) -> Any:
    email = user_in.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user:
        raise HTTPException(status_code=400, detail="The user with this username already exists.")
    
    # RBAC logic: Managers can only create Agents in their own company. Admins can do anything.
    if current_user.role == "manager":
        if getattr(user_in, 'role', '') not in ["agent"]:
            raise HTTPException(status_code=403, detail="Managers can only create agents.")
        target_role = "agent"
        target_company = current_user.company_id or current_user.active_company_id
    elif current_user.role == "client":
        if getattr(user_in, 'role', '') not in ["manager", "agent"]:
            raise HTTPException(status_code=403, detail="Clients can only create managers or agents under their company.")
        target_role = getattr(user_in, 'role')
        target_company = getattr(user_in, 'company_id', current_user.active_company_id)
        # Ensure the client owns the target company
        from sqlalchemy import text
        company = db.execute(text("SELECT id FROM companies WHERE id = :cid AND user_id = :uid"), {"cid": target_company, "uid": current_user.id}).fetchone()
        if not company:
            raise HTTPException(status_code=403, detail="Company not found or access denied.")
    else:
        target_role = getattr(user_in, 'role', "client")
        target_company = getattr(user_in, 'company_id', None)

    # Inherit subscription_tier from the creator if the creator is a client or manager.
    inherited_tier = current_user.subscription_tier if current_user.role in ["client", "manager"] else None

    user = User(
        email=email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        is_superuser=user_in.is_superuser if current_user.is_superuser else False,
        role=target_role,
        company_id=target_company,
        active_company_id=target_company,
        created_by_id=current_user.id,
        subscription_tier=inherited_tier or "trial",
    )
    db.add(user)
    db.flush()  # Flush to get user.id before linking companies

    # ── Multi-company: Insert links into user_company_links ──
    from sqlalchemy import text
    all_company_ids = set()
    if target_company:
        all_company_ids.add(target_company)
    if user_in.company_ids:
        all_company_ids.update(user_in.company_ids)
    for cid in all_company_ids:
        db.execute(
            text("INSERT INTO user_company_links (user_id, company_id, role) VALUES (:uid, :cid, :role) ON CONFLICT DO NOTHING"),
            {"uid": user.id, "cid": cid, "role": target_role}
        )

    db.commit()
    db.refresh(user)

    log_activity(db, current_user.id, "create_user", "User", user.id, {"created_role": target_role})

    # Attach linked_company_ids to response
    user.linked_company_ids = list(all_company_ids)
    return user

@router.put("/me", response_model=UserSchema)
def update_user_me(
    *,
    db: Session = Depends(deps.get_db),
    full_name: str = Body(None),
    password: str = Body(None),
    email: EmailStr = Body(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    if full_name is not None:
        current_user.full_name = full_name
    if password is not None:
        current_user.hashed_password = security.get_password_hash(password)
    if email is not None:
        current_user.email = email.strip().lower()
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/me", response_model=UserSchema)
def read_user_me(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    return current_user

@router.put("/{user_id}", response_model=UserSchema)
def update_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # RBAC logic
    if not current_user.is_superuser:
        if current_user.role == "client":
            # Client can update their own managers/agents or users in companies they own
            can_update = user.created_by_id == current_user.id
            if not can_update and user.company_id:
                co = db.execute(text("SELECT id FROM companies WHERE id = :cid AND user_id = :uid"), {"cid": user.company_id, "uid": current_user.id}).fetchone()
                if co:
                    can_update = True
            
            if not can_update:
                raise HTTPException(status_code=403, detail="Not authorized to update this user.")
        elif current_user.role == "manager":
            # Manager can only update agents in their company
            if user.company_id != current_user.company_id or user.role != "agent":
                raise HTTPException(status_code=403, detail="Not authorized to update this user.")
        else:
            if user.id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized.")

    if user_in.email is not None:
        user.email = user_in.email.strip().lower()
    if user_in.password is not None:
        user.hashed_password = security.get_password_hash(user_in.password)
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    if user_in.role is not None:
        if not current_user.is_superuser and user_in.role == "superuser":
             raise HTTPException(status_code=403, detail="Cannot promote to superuser")
        user.role = user_in.role
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    log_activity(db, current_user.id, "update_user", "User", user.id, {"updated_fields": user_in.dict(exclude_unset=True)}, company_id=getattr(current_user, 'active_company_id', current_user.company_id))

    return user

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

@router.put("/me/password")
def update_my_password(
    *,
    db: Session = Depends(deps.get_db),
    password_in: PasswordUpdate,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Update current user password."""
    if not security.verify_password(password_in.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.hashed_password = security.get_password_hash(password_in.new_password)
    db.add(current_user)
    db.commit()
    return {"ok": True, "message": "Password updated successfully"}

@router.delete("/{user_id}", response_model=UserSchema)
def delete_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # RBAC logic
    if not current_user.is_superuser:
        if current_user.role == "client":
            can_delete = user.created_by_id == current_user.id
            if not can_delete and user.company_id:
                co = db.execute(text("SELECT id FROM companies WHERE id = :cid AND user_id = :uid"), {"cid": user.company_id, "uid": current_user.id}).fetchone()
                if co:
                    can_delete = True
            
            if not can_delete:
                raise HTTPException(status_code=403, detail="Not authorized.")
        elif current_user.role == "manager":
             if user.company_id != current_user.company_id or user.role != "agent":
                raise HTTPException(status_code=403, detail="Not authorized.")
        else:
            raise HTTPException(status_code=403, detail="Not authorized.")

    db.delete(user)
    db.commit()
    
    log_activity(db, current_user.id, "delete_user", "User", user_id, {"deleted_email": user.email}, company_id=getattr(current_user, 'active_company_id', current_user.company_id))
    
    return user


# ───────────────────────────────────────────────────────────
# Multi-Company Endpoints
# ───────────────────────────────────────────────────────────

@router.put("/me/active-company")
def switch_active_company(
    *,
    db: Session = Depends(deps.get_db),
    company_id: int = Body(..., embed=True),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Switch the authenticated user's active company context.
    Only allowed if the user is actually linked to the target company.
    """
    from sqlalchemy import text
    link = db.execute(
        text("SELECT 1 FROM user_company_links WHERE user_id = :uid AND company_id = :cid"),
        {"uid": current_user.id, "cid": company_id}
    ).fetchone()
    # Also allow if user is the owner of the company
    if not link:
        owner = db.execute(
            text("SELECT 1 FROM companies WHERE id = :cid AND user_id = :uid"),
            {"cid": company_id, "uid": current_user.id}
        ).fetchone()
        if not owner:
            raise HTTPException(status_code=403, detail="You are not linked to this company.")

    current_user.active_company_id = company_id
    db.commit()
    return {"ok": True, "active_company_id": company_id}


@router.get("/{user_id}/companies")
def get_user_companies(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Return the list of companies linked to a specific user.
    Accessible by: the user themselves, their Client (creator), or Superuser.
    """
    from sqlalchemy import text
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    rows = db.execute(
        text("""
            SELECT c.id, c.name, ucl.role
            FROM user_company_links ucl
            JOIN companies c ON c.id = ucl.company_id
            WHERE ucl.user_id = :uid
            ORDER BY c.name
        """),
        {"uid": user_id}
    ).fetchall()
    return [{"id": r.id, "name": r.name, "role": r.role} for r in rows]


class CompanyAssignPayload(BaseModel):
    company_ids: List[int]

@router.put("/{user_id}/companies")
def set_user_companies(
    user_id: int,
    payload: CompanyAssignPayload,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Replace the full set of companies linked to a user.
    Only Clients (owners) and Superusers can call this.
    """
    from sqlalchemy import text
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # RBAC: only the client who created this user (or superuser) can change company links
    if not current_user.is_superuser and current_user.id != target.created_by_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this user's companies.")

    # Validate: each company_id must belong to the calling client
    if not current_user.is_superuser:
        for cid in payload.company_ids:
            co = db.execute(
                text("SELECT id FROM companies WHERE id = :cid AND user_id = :uid"),
                {"cid": cid, "uid": current_user.id}
            ).fetchone()
            if not co:
                raise HTTPException(status_code=403, detail=f"Company {cid} not found or access denied.")

    # Delete existing links and replace with new set
    db.execute(text("DELETE FROM user_company_links WHERE user_id = :uid"), {"uid": user_id})
    for cid in payload.company_ids:
        db.execute(
            text("INSERT INTO user_company_links (user_id, company_id, role) VALUES (:uid, :cid, :role) ON CONFLICT DO NOTHING"),
            {"uid": user_id, "cid": cid, "role": target.role}
        )

    # Update primary company_id to the first one
    if payload.company_ids:
        target.company_id = payload.company_ids[0]
        target.active_company_id = payload.company_ids[0]

    db.commit()
    log_activity(db, current_user.id, "update_user_companies", "User", user_id, {"company_ids": payload.company_ids})
    return {"ok": True, "linked_company_ids": payload.company_ids}

@router.get("/team/logs")
def read_team_logs(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Fetch activity logs for a Client's or Manager's team"""
    from sqlalchemy import text
    if current_user.role == "client":
        # Clients can see logs of all their companies' managers and agents, plus their own
        query = text("""
            SELECT al.*, u.email, u.full_name, u.role
            FROM activity_logs al
            JOIN users u ON u.id = al.user_id
            LEFT JOIN companies c ON c.id = al.company_id
            WHERE c.user_id = :uid OR u.id = :uid OR al.user_id = :uid
            ORDER BY al.created_at DESC OFFSET :skip LIMIT :limit
        """)
        params = {"uid": current_user.id, "skip": skip, "limit": limit}
    elif current_user.role == "manager":
        # Managers can see logs of agents in their company, plus their own
        query = text("""
            SELECT al.*, u.email, u.full_name, u.role
            FROM activity_logs al
            JOIN users u ON u.id = al.user_id
            WHERE (al.company_id = :cid AND u.role = 'agent') OR u.id = :uid
            ORDER BY al.created_at DESC OFFSET :skip LIMIT :limit
        """)
        params = {"cid": current_user.company_id, "uid": current_user.id, "skip": skip, "limit": limit}
    elif current_user.role == "agent":
        # Agents only see themselves
        query = text("""
            SELECT al.*, u.email, u.full_name, u.role
            FROM activity_logs al
            JOIN users u ON u.id = al.user_id
            WHERE u.id = :uid
            ORDER BY al.created_at DESC OFFSET :skip LIMIT :limit
        """)
        params = {"uid": current_user.id, "skip": skip, "limit": limit}
    else:
        raise HTTPException(status_code=403, detail="Not applicable")

    rows = db.execute(query, params).fetchall()
    
    result = []
    for row in rows:
        d = dict(row._mapping)
        user_info = {"email": d.pop("email"), "full_name": d.pop("full_name"), "role": d.pop("role")}
        d["user"] = user_info
        result.append(d)
        
    return result

@router.get("/{user_id}/logs")
def read_user_logs(
    user_id: int,
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    return db.query(ActivityLog).filter(ActivityLog.user_id == user_id).order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/logs/all")
def read_all_logs(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 200,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """Fetch global activity logs for Admin visualization"""
    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()
    # Need to return user details as well
    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        result.append({
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "resource": log.resource,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at,
            "user": {"email": user.email, "full_name": user.full_name} if user else None
        })
    return result
