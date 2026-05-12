from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.models.system_announcement import SystemAnnouncement
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    type: str

class AnnouncementUpdate(BaseModel):
    title: str | None = None
    message: str | None = None
    type: str | None = None

class AnnouncementResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/", response_model=AnnouncementResponse)
def create_announcement(
    *,
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.get_current_active_user),
    announcement_in: AnnouncementCreate,
) -> Any:
    """Create a new system announcement (admin only)."""
    if not current_user.is_superuser and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    announcement = SystemAnnouncement(
        title=announcement_in.title,
        message=announcement_in.message,
        type=announcement_in.type
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement

@router.get("/", response_model=List[AnnouncementResponse])
def get_active_announcements(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Retrieve active system announcements to display on Client Dashboards."""
    announcements = db.query(SystemAnnouncement).filter(
        SystemAnnouncement.is_active == True
    ).order_by(SystemAnnouncement.created_at.desc()).offset(skip).limit(limit).all()
    return announcements

@router.get("/all", response_model=List[AnnouncementResponse])
def get_all_announcements(
    *,
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.get_current_active_user),
) -> Any:
    """Retrieve ALL announcements including inactive ones (admin panel)."""
    if not current_user.is_superuser and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    announcements = db.query(SystemAnnouncement).order_by(
        SystemAnnouncement.created_at.desc()
    ).all()
    return announcements

@router.patch("/{id}/toggle", response_model=AnnouncementResponse)
def toggle_announcement(
    *,
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.get_current_active_user),
    id: int,
) -> Any:
    """Toggle active/inactive status of an announcement."""
    if not current_user.is_superuser and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    announcement = db.query(SystemAnnouncement).filter(SystemAnnouncement.id == id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    announcement.is_active = not announcement.is_active
    db.commit()
    db.refresh(announcement)
    return announcement

@router.delete("/{id}")
def delete_announcement(
    *,
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.get_current_active_user),
    id: int,
) -> Any:
    """Hard delete an announcement."""
    if not current_user.is_superuser and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    announcement = db.query(SystemAnnouncement).filter(SystemAnnouncement.id == id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(announcement)
    db.commit()
    return {"ok": True}
