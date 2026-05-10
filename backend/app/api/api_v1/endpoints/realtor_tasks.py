"""
Endpoints for Realtor Task Ecosystem.
Handles: available tasks, claiming, submitting evidence (photo+GPS), commissions.
"""
import math
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api import deps
from app.models.user import User

router = APIRouter()

# ── Helpers ──────────────────────────────────────────────────────────────────

def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters between two GPS coordinates."""
    R = 6_371_000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Schemas ───────────────────────────────────────────────────────────────────

class ClaimTaskPayload(BaseModel):
    deadline_hours: int = 48   # how many hours the realtor commits to

class SubmitEvidencePayload(BaseModel):
    submission_lat: Optional[float] = None
    submission_lng: Optional[float] = None
    notes: Optional[str] = None
    # Files are handled via multipart separately

class ReviewSubmissionPayload(BaseModel):
    approved: bool
    review_notes: Optional[str] = None


# ── Realtor: Available Tasks ───────────────────────────────────────────────

@router.get("/available")
def get_available_tasks(
    state: Optional[str] = None,
    task_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 30,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Returns all open tasks not yet claimed by any realtor."""
    state_clause = "AND LOWER(p.state) = LOWER(:state)" if state else ""
    type_clause = "AND t.task_type = :task_type" if task_type else ""

    params = {"skip": skip, "limit": limit}
    if state:
        params["state"] = state
    if task_type:
        params["task_type"] = task_type

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
          {state_clause}
          {type_clause}
        ORDER BY t.reward_points DESC, t.created_at DESC
        LIMIT :limit OFFSET :skip
    """), params).fetchall()

    return [dict(r._mapping) for r in rows]


@router.get("/my")
def get_my_tasks(
    status: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Returns tasks claimed or submitted by the current realtor."""
    status_clause = "AND t.status = :status" if status else ""
    params = {"uid": current_user.id}
    if status:
        params["status"] = status

    rows = db.execute(text(f"""
        SELECT
            t.id, t.title, t.description, t.task_type, t.status,
            t.address, t.latitude, t.longitude, t.geo_radius_meters,
            t.min_photos, t.max_photos, CAST(t.reward_points * 0.7 AS INT) AS reward_points,
            t.created_at, t.deadline, t.claimed_at, t.submitted_at, t.approved_at,
            p.parcel_id, p.state, p.county,
            u.full_name AS investor_name
        FROM realtor_tasks t
        JOIN property_details p ON p.id = t.property_id
        LEFT JOIN users u ON u.id = t.investor_user_id
        WHERE t.realtor_user_id = :uid
          {status_clause}
        ORDER BY t.created_at DESC
    """), params).fetchall()

    return [dict(r._mapping) for r in rows]


@router.post("/{task_id}/claim")
def claim_task(
    task_id: int,
    payload: ClaimTaskPayload,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Realtor claims an open task, blocking other realtors for deadline_hours."""
    task = db.execute(text("SELECT * FROM realtor_tasks WHERE id = :id"), {"id": task_id}).fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
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


@router.post("/{task_id}/submit")
async def submit_task_evidence(
    task_id: int,
    submission_lat: Optional[float] = Form(None),
    submission_lng: Optional[float] = Form(None),
    notes: Optional[str] = Form(None),
    files: list[UploadFile] = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Realtor submits photo evidence + GPS for a claimed task."""
    import os, uuid, shutil

    task = db.execute(text("SELECT * FROM realtor_tasks WHERE id = :id"), {"id": task_id}).fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.realtor_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You did not claim this task.")
    if task.status not in ("claimed",):
        raise HTTPException(status_code=409, detail=f"Task cannot be submitted in status '{task.status}'.")

    # Validate photo count
    if len(files) < task.min_photos:
        raise HTTPException(status_code=400, detail=f"Minimum {task.min_photos} photos required. Got {len(files)}.")
    if len(files) > task.max_photos:
        raise HTTPException(status_code=400, detail=f"Maximum {task.max_photos} photos allowed.")

    # Geolocation validation
    distance = None
    geo_validated = False
    if submission_lat is not None and submission_lng is not None and task.latitude and task.longitude:
        distance = haversine_meters(submission_lat, submission_lng, task.latitude, task.longitude)
        geo_validated = distance <= (task.geo_radius_meters or 50)

    # Save files
    upload_dir = f"/app/uploads/tasks/{task_id}"
    os.makedirs(upload_dir, exist_ok=True)
    saved_paths = []
    for f in files:
        ext = f.filename.split(".")[-1] if "." in f.filename else "jpg"
        fname = f"{uuid.uuid4()}.{ext}"
        dest = os.path.join(upload_dir, fname)
        with open(dest, "wb") as out:
            shutil.copyfileobj(f.file, out)
        saved_paths.append(f"/uploads/tasks/{task_id}/{fname}")

    # Insert submission record
    db.execute(text("""
        INSERT INTO task_submissions
            (task_id, realtor_user_id, submission_lat, submission_lng,
             distance_meters, geo_validated, file_path, file_type, photo_count, notes,
             review_status)
        VALUES
            (:task_id, :uid, :lat, :lng, :dist, :geo_ok,
             :file_path, 'image', :photo_count, :notes, :review_status)
    """), {
        "task_id": task_id,
        "uid": current_user.id,
        "lat": submission_lat,
        "lng": submission_lng,
        "dist": distance,
        "geo_ok": geo_validated,
        "file_path": ",".join(saved_paths),
        "photo_count": len(files),
        "notes": notes,
        "review_status": "approved" if geo_validated else "pending",
    })

    # Update task status
    new_status = "submitted"
    db.execute(text("""
        UPDATE realtor_tasks
        SET status = :status, submitted_at = NOW()
        WHERE id = :id
    """), {"status": new_status, "id": task_id})

    # If geo_validated → auto-approve and credit points
    if geo_validated:
        _approve_task(task_id, task.reward_points, current_user.id, db)
        _copy_task_photos_to_attachments(task_id, task.property_id, task.investor_user_id, db)

    db.commit()
    return {
        "ok": True,
        "geo_validated": geo_validated,
        "distance_meters": round(distance, 1) if distance else None,
        "photos_saved": len(saved_paths),
        "auto_approved": geo_validated,
    }

def _copy_task_photos_to_attachments(task_id: int, property_id: int, investor_id: int, db: Session):
    """Copies approved photos from task submissions to the property's public attachments pool."""
    submission = db.execute(text("""
        SELECT file_path FROM task_submissions 
        WHERE task_id = :task_id AND review_status = 'approved'
        ORDER BY submitted_at DESC LIMIT 1
    """), {"task_id": task_id}).fetchone()
    
    if submission and submission.file_path:
        paths = submission.file_path.split(',')
        
        # 1. Add to client_attachments for the investor (always)
        for p in paths:
            filename = p.split('/')[-1]
            db.execute(text("""
                INSERT INTO client_attachments (user_id, property_id, file_path, filename)
                VALUES (:uid, :pid, :path, :fname)
            """), {
                "uid": investor_id,
                "pid": property_id,
                "path": p,
                "fname": filename
            })

        # 2. Add to public_photos in property_details if visibility is public
        prop = db.execute(text("SELECT visibility, public_photos FROM property_details WHERE id = :id"), {"id": property_id}).fetchone()
        if prop and prop.visibility == 'public':
            existing = prop.public_photos
            new_photos = submission.file_path
            combined = f"{existing},{new_photos}" if existing else new_photos
            db.execute(text("UPDATE property_details SET public_photos = :photos WHERE id = :id"), {
                "photos": combined,
                "id": property_id
            })


def _approve_task(task_id: int, reward_points: int, realtor_user_id: int, db: Session):
    """Internal helper: marks task approved and credits commission points."""
    db.execute(text("""
        UPDATE realtor_tasks SET status = 'approved', approved_at = NOW()
        WHERE id = :id
    """), {"id": task_id})

    realtor_points = int(reward_points * 0.7)
    usd_value = realtor_points / 100.0
    db.execute(text("""
        INSERT INTO realtor_commissions
            (realtor_user_id, task_id, points, usd_value, type, status, description)
        VALUES
            (:uid, :task_id, :points, :usd, 'earned', 'available', :desc)
    """), {
        "uid": realtor_user_id,
        "task_id": task_id,
        "points": realtor_points,
        "usd": usd_value,
        "desc": f"Task #{task_id} approved — photo verification (70% cut of {reward_points} pts)",
    })


@router.get("/exports")
def get_exported_properties(
    state: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Returns all active property exports visible to realtors.
    Includes full property details and investor contact info.
    """
    state_clause = "AND LOWER(p.state) = LOWER(:state)" if state else ""
    params: dict = {"skip": skip, "limit": limit}
    if state:
        params["state"] = state

    rows = db.execute(text(f"""
        SELECT
            e.id AS export_id,
            e.contact_name,
            e.contact_phone,
            e.contact_email,
            e.notes AS export_notes,
            e.exported_at,
            p.id AS property_id,
            p.parcel_id,
            p.address,
            p.state,
            p.county,
            p.property_type,
            e.requested_sale_price,
            p.lot_acres,
            p.owner_name,
            p.bedrooms,
            p.bathrooms,
            p.sqft,
            p.year_built,
            p.latitude,
            p.longitude,
            p.zoning,
            p.legal_description,
            p.tax_amount,
            p.tax_year,
            p.num_units,
            p.availability_status,
            u.full_name AS investor_name
        FROM property_exports e
        JOIN property_details p ON p.id = e.property_id
        LEFT JOIN users u ON u.id = e.investor_user_id
        WHERE e.is_active = TRUE
          {state_clause}
        ORDER BY e.exported_at DESC
        LIMIT :limit OFFSET :skip
    """), params).fetchall()

    return {
        "items": [dict(r._mapping) for r in rows],
        "total": len(rows),
    }


@router.get("/commissions")
def get_my_commissions(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Returns full commission history and balance for the realtor."""
    rows = db.execute(text("""
        SELECT c.*, t.title AS task_title, t.task_type
        FROM realtor_commissions c
        LEFT JOIN realtor_tasks t ON t.id = c.task_id
        WHERE c.realtor_user_id = :uid
        ORDER BY c.created_at DESC
    """), {"uid": current_user.id}).fetchall()

    commissions = [dict(r._mapping) for r in rows]
    total_points = sum(c["points"] for c in commissions if c["type"] == "earned")
    withdrawn = sum(abs(c["points"]) for c in commissions if c["type"] == "withdrawn")
    available_points = total_points - withdrawn

    return {
        "commissions": commissions,
        "total_earned_points": total_points,
        "total_earned_usd": round(total_points / 100, 2),
        "withdrawn_points": withdrawn,
        "available_points": available_points,
        "available_usd": round(available_points / 100, 2),
    }
