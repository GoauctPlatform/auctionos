from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api import deps
from app.models.user import User
from app.models.agent_due_diligence import AgentDueDiligenceProfile
from app.models.contractor import ContractorProfile
from app.services.activity import log_activity
from datetime import datetime
import pytz

router = APIRouter()

@router.get("/pending")
def list_pending_verifications(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    List all pending verifications for field agents and contractors.
    Only accessible by superusers.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    pending_agents = db.query(AgentDueDiligenceProfile).filter(
        AgentDueDiligenceProfile.verification_status == "pending"
    ).all()

    pending_contractors = db.query(ContractorProfile).filter(
        ContractorProfile.verification_status == "pending"
    ).all()

    return {
        "field_agents": pending_agents,
        "contractors": pending_contractors
    }

@router.post("/agent/{user_id}/approve")
def approve_agent(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Approve a field agent's work permit / document.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    profile = db.query(AgentDueDiligenceProfile).filter(AgentDueDiligenceProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Agent profile not found")

    profile.verification_status = "approved"
    profile.document_verification_date = datetime.now(pytz.utc)
    
    # Update the user role from pending to agent_due_diligence
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.role == "pending":
        user.role = "agent_due_diligence"

    db.commit()
    
    log_activity(db, user_id, "agent_approved", "AgentDueDiligenceProfile", profile.id, {"admin_id": current_user.id})

    # Ideally we'd send an email here using background_tasks

    return {"status": "success", "message": "Agent approved"}

@router.post("/contractor/{user_id}/approve")
def approve_contractor(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Approve a contractor's license / profile.
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    profile = db.query(ContractorProfile).filter(ContractorProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Contractor profile not found")

    profile.verification_status = "approved"
    profile.document_verification_date = datetime.now(pytz.utc)
    
    # Update the user role from pending to contractor
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.role == "pending":
        user.role = "contractor"

    db.commit()

    log_activity(db, user_id, "contractor_approved", "ContractorProfile", profile.id, {"admin_id": current_user.id})

    return {"status": "success", "message": "Contractor approved"}
