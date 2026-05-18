"""
Endpoints for Field Agent Due Diligence Ecosystem.
Handles: agent onboarding, available geo-tasks, claiming, submitting evidence (photo+GPS), and agent earnings.
"""
import math
import os
import uuid
import shutil
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api import deps
from app.models.user import User
from app.models.agent_due_diligence import AgentDueDiligenceProfile

router = APIRouter()

# ── Helpers ──────────────────────────────────────────────────────────────────

def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters between two GPS coordinates."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

# ── Schemas ───────────────────────────────────────────────────────────────────

class AgentProfilePayload(BaseModel):
    coverage_area: str
    vehicle_type: str

class ClaimTaskPayload(BaseModel):
    deadline_hours: int = 48

# ── Agent Profile ─────────────────────────────────────────────────────────────

@router.get("/profile")
def get_my_agent_profile(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Returns the agent profile linked to the current user."""
    profile = db.query(AgentDueDiligenceProfile).filter(AgentDueDiligenceProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="No agent profile found for this user.")
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "coverage_area": profile.coverage_area,
        "coverage_radius_miles": profile.coverage_radius_miles,
        "vehicle_type": profile.vehicle_type,
        "social_security": profile.social_security,
        "payment_account": profile.payment_account,
        "verification_status": profile.verification_status,
        "rejection_reason": profile.rejection_reason,
        "created_at": profile.created_at
    }

@router.post("/profile")
def create_agent_profile(
    payload: AgentProfilePayload,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Submit field agent profile info."""
    existing = db.query(AgentDueDiligenceProfile).filter(AgentDueDiligenceProfile.user_id == current_user.id).first()
    if existing:
        existing.coverage_area = payload.coverage_area
        existing.vehicle_type = payload.vehicle_type
    else:
        profile = AgentDueDiligenceProfile(
            user_id=current_user.id,
            coverage_area=payload.coverage_area,
            vehicle_type=payload.vehicle_type,
            is_verified=False
        )
        db.add(profile)
        
    db.commit()
    return {"ok": True, "message": "Profile updated successfully"}

# ── Agent Tasks (Geo-Tasks Only) ───────────────────────────────────────────────

@router.get("/available")
def get_available_geo_tasks(
    state: Optional[str] = None,
    skip: int = 0,
    limit: int = 30,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Returns all open GEO tasks not yet claimed."""
    state_clause = "AND LOWER(p.state) = LOWER(:state)" if state else ""

    params = {"skip": skip, "limit": limit}
    if state:
        params["state"] = state

    rows = db.execute(text(f"""
        SELECT
            t.id, t.title, t.description, t.task_type, t.status,
            t.address, t.latitude, t.longitude, t.geo_radius_meters,
            t.min_photos, t.max_photos, CAST(t.reward_points * 0.7 AS INT) AS reward_points,
            t.created_at,
            p.parcel_id, p.state, p.county, p.property_type,
            u.full_name AS investor_name
        FROM realtor_tasks t
        JOIN property_details p ON p.id = t.property_id
        LEFT JOIN users u ON u.id = t.investor_user_id
        WHERE t.status = 'open'
          AND t.task_type IN ('geo', 'photo')
          {state_clause}
        ORDER BY t.reward_points DESC, t.created_at DESC
        LIMIT :limit OFFSET :skip
    """), params).fetchall()

    return [dict(r._mapping) for r in rows]

@router.post("/{task_id}/claim")
def claim_task(
    task_id: int,
    payload: ClaimTaskPayload,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Agent claims an open geo task."""
    # 1. Verify partner account status
    agent = db.execute(text("SELECT verification_status FROM agent_due_diligence_profiles WHERE user_id = :uid"), {"uid": current_user.id}).fetchone()
    if not agent or agent.verification_status != "verified":
        raise HTTPException(status_code=403, detail="Your partner account must be verified by compliance before claiming tasks.")

    # 2. Enforce the 5-task limit
    active_count = db.execute(text("""
        SELECT COUNT(id) FROM realtor_tasks 
        WHERE realtor_user_id = :uid AND status IN ('claimed', 'submitted')
    """), {"uid": current_user.id}).scalar()
    if active_count >= 5:
        raise HTTPException(status_code=400, detail="Claim limit reached. You can hold a maximum of 5 concurrent active tasks.")

    task = db.execute(text("SELECT * FROM realtor_tasks WHERE id = :id AND task_type IN ('geo', 'photo')"), {"id": task_id}).fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or is not a geo-task")
    if task.status != "open":
        raise HTTPException(status_code=409, detail=f"Task is already '{task.status}' — cannot be claimed.")
    if task.realtor_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You already claimed this task.")

    deadline = datetime.now(timezone.utc) + timedelta(hours=payload.deadline_hours)

    db.execute(text("""
        UPDATE realtor_tasks
        SET status = 'claimed',
            realtor_user_id = :uid,
            claimed_at = NOW(),
            deadline = :deadline
        WHERE id = :id
    """), {"uid": current_user.id, "id": task_id, "deadline": deadline})
    db.commit()
    return {"ok": True, "task_id": task_id, "deadline": deadline.isoformat()}
