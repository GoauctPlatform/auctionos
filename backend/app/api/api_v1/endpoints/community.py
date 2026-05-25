from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.api import deps
from app.models.user import User
from app.models.community_update import CommunityUpdate
from app.schemas.community import CommunityUpdate as CommunityUpdateSchema, CommunityUpdateCreate, CommunityUpdateUpdate
from app.core.rbac import allow_admin_only

router = APIRouter()

@router.get("/", response_model=List[CommunityUpdateSchema])
def read_community_updates(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Fetch all community updates. Accessible by any authenticated user."""
    updates = db.query(CommunityUpdate).order_by(CommunityUpdate.id.desc()).offset(skip).limit(limit).all()
    
    # Self-healing: if database has zero community updates, auto-seed with standard mocks!
    if not updates:
        mock_seeds = [
            {
                "date": "April 14, 2026",
                "tag": "Market Update",
                "title": "Florida Tax Deed Surplus Laws Under Review",
                "content": "Governor's office is currently reviewing a new bill that could significantly accelerate the surplus claims process after tax deed auctions. We urge investors looking at Orange and Miami-Dade counties to monitor the timeline. We will integrate any changes into our Yield estimator immediately.",
                "author": "GoAuct Admin"
            },
            {
                "date": "April 10, 2026",
                "tag": "System Note",
                "title": "Texas Data Pipeline Upgrade Complete",
                "content": "We have finalized the integration with 15 new Texas counties, bringing our total coverage in the state to 98%. All new redeemable deed listings will now feature automated title scanning for secondary IRS liens.",
                "author": "System Operations"
            },
            {
                "date": "April 02, 2026",
                "tag": "Strategy",
                "title": "Navigating Indiana Commissioner Sales",
                "content": "A major influx of commissioner sale properties is expected next month in Marion County. Unlike traditional tax sales, these properties are cleared of all taxes and sold free and clear at highly discounted minimum bids. Ensure your search filters in GoAuct are set to capture 'Commissioner Sale' tags.",
                "author": "Investment Strategy Team"
            }
        ]
        for seed in mock_seeds:
            db_obj = CommunityUpdate(**seed)
            db.add(db_obj)
        db.commit()
        updates = db.query(CommunityUpdate).order_by(CommunityUpdate.id.desc()).all()
        
    return updates

@router.post("/", response_model=CommunityUpdateSchema)
def create_community_update(
    *,
    db: Session = Depends(deps.get_db),
    update_in: CommunityUpdateCreate,
    current_user: User = Depends(allow_admin_only),
) -> Any:
    """Post a new community update. Restricted to Admins/Superusers."""
    db_obj = CommunityUpdate(
        date=update_in.date or datetime.now().strftime("%B %d, %Y"),
        tag=update_in.tag or "General",
        title=update_in.title,
        content=update_in.content,
        author=update_in.author or current_user.full_name or current_user.email.split('@')[0],
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.put("/{id}", response_model=CommunityUpdateSchema)
def update_community_update(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    update_in: CommunityUpdateUpdate,
    current_user: User = Depends(allow_admin_only),
) -> Any:
    """Edit a community update. Restricted to Admins/Superusers."""
    db_obj = db.query(CommunityUpdate).filter(CommunityUpdate.id == id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Update not found")
        
    update_data = update_in.dict(exclude_unset=True)
    for field in update_data:
        setattr(db_obj, field, update_data[field])
        
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.delete("/{id}", response_model=Any)
def delete_community_update(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(allow_admin_only),
) -> Any:
    """Delete a community update. Restricted to Admins/Superusers."""
    db_obj = db.query(CommunityUpdate).filter(CommunityUpdate.id == id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Update not found")
        
    db.delete(db_obj)
    db.commit()
    return {"ok": True, "message": "Community update deleted successfully."}
