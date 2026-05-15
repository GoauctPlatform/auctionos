"""
Investor-side endpoints for creating tasks, reviewing submissions,
and managing property exports.
"""
from datetime import datetime, timezone
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api import deps
from app.models.user import User
from app.core.email import send_email
from app.core.email_templates import get_task_update_template

router = APIRouter()

# ── Pricing helpers ───────────────────────────────────────────────────────────
MIN_PHOTOS = 3
MIN_REWARD_POINTS = 500   # 3 photos = 500 pts = $5.00
EXTRA_PHOTO_POINTS = 100  # each additional photo adds 100 pts

def calculate_min_points(min_photos: int) -> int:
    extras = max(0, min_photos - MIN_PHOTOS)
    return MIN_REWARD_POINTS + (extras * EXTRA_PHOTO_POINTS)


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateTaskPayload(BaseModel):
    property_id: int
    title: str
    description: Optional[str] = None
    task_type: str = "photo_verification"
    min_photos: int = 3
    max_photos: int = 10
    reward_points: int = 500   # investor sets this; validated server-side

class ReviewPayload(BaseModel):
    approved: bool
    review_notes: Optional[str] = None

class ExportPropertyPayload(BaseModel):
    property_id: int
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    requested_sale_price: Optional[float] = None
    notes: Optional[str] = None


# ── Task CRUD ────────────────────────────────────────────────────────────────

@router.post("/tasks")
def create_task(
    payload: CreateTaskPayload,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Investor creates a due-diligence task for a property."""
    from app.services.permission_service import PermissionService
    PermissionService.check_feature_access(db, current_user, "tasks")

    # Validate photo count
    if payload.min_photos < MIN_PHOTOS:
        raise HTTPException(status_code=400, detail=f"Minimum photos must be at least {MIN_PHOTOS}.")
    if payload.max_photos > 10:
        raise HTTPException(status_code=400, detail="Maximum photos cannot exceed 10.")
    if payload.min_photos > payload.max_photos:
        raise HTTPException(status_code=400, detail="min_photos cannot exceed max_photos.")

    # Validate reward points vs. photo count
    min_required = calculate_min_points(payload.min_photos)
    if payload.reward_points < min_required:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum reward for {payload.min_photos} photos is {min_required} points (${min_required / 100:.2f})."
        )

    # Fetch property location for geo-validation
    prop = db.execute(
        text("SELECT id, address, latitude, longitude, state FROM property_details WHERE id = :id"),
        {"id": payload.property_id}
    ).fetchone()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found.")

    row = db.execute(text("""
        INSERT INTO realtor_tasks
            (property_id, investor_user_id, task_type, title, description,
             address, latitude, longitude, geo_radius_meters,
             min_photos, max_photos, reward_points, status)
        VALUES
            (:property_id, :investor_id, :task_type, :title, :description,
             :address, :lat, :lng, 50,
             :min_photos, :max_photos, :reward_points, 'open')
        RETURNING id
    """), {
        "property_id": payload.property_id,
        "investor_id": current_user.id,
        "task_type": payload.task_type,
        "title": payload.title,
        "description": payload.description,
        "address": prop.address,
        "lat": prop.latitude,
        "lng": prop.longitude,
        "min_photos": payload.min_photos,
        "max_photos": payload.max_photos,
        "reward_points": payload.reward_points,
    }).fetchone()
    db.commit()
    return {"ok": True, "task_id": row.id, "min_reward_points": min_required}


@router.get("/tasks")
def get_my_created_tasks(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Investor sees all tasks they created."""
    rows = db.execute(text("""
        SELECT
            t.*,
            p.parcel_id, p.state, p.county,
            u.full_name AS realtor_name
        FROM realtor_tasks t
        JOIN property_details p ON p.id = t.property_id
        LEFT JOIN users u ON u.id = t.realtor_user_id
        WHERE t.investor_user_id = :uid
        ORDER BY t.created_at DESC
    """), {"uid": current_user.id}).fetchall()
    return [dict(r._mapping) for r in rows]


@router.get("/tasks/{task_id}/submissions")
def get_task_submissions(
    task_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Investor views all submissions for one of their tasks."""
    task = db.execute(
        text("SELECT investor_user_id FROM realtor_tasks WHERE id = :id"),
        {"id": task_id}
    ).fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.investor_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your task.")

    rows = db.execute(text("""
        SELECT s.*, u.full_name AS realtor_name
        FROM task_submissions s
        LEFT JOIN users u ON u.id = s.realtor_user_id
        WHERE s.task_id = :task_id
        ORDER BY s.submitted_at DESC
    """), {"task_id": task_id}).fetchall()
    return [dict(r._mapping) for r in rows]


async def review_task_submission(
    task_id: int,
    payload: ReviewPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Investor approves or rejects the latest submission for a task."""
    task = db.execute(
        text("SELECT * FROM realtor_tasks WHERE id = :id"),
        {"id": task_id}
    ).fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.investor_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your task.")
    if task.status not in ("submitted",):
        raise HTTPException(status_code=409, detail=f"Task status is '{task.status}', cannot review now.")

    review_status = "approved" if payload.approved else "rejected"

    # Update the latest submission
    db.execute(text("""
        UPDATE task_submissions
        SET review_status = :status, review_notes = :notes, reviewed_at = NOW()
        WHERE task_id = :task_id
        ORDER BY submitted_at DESC
        LIMIT 1
    """), {"status": review_status, "notes": payload.review_notes, "task_id": task_id})

    if payload.approved:
        # Mark task approved and credit realtor
        db.execute(text("""
            UPDATE realtor_tasks
            SET status = 'approved', approved_at = NOW()
            WHERE id = :id
        """), {"id": task_id})
        if task.realtor_user_id:
            realtor_points = int(task.reward_points * 0.7)
            usd = realtor_points / 100.0
            db.execute(text("""
                INSERT INTO realtor_commissions
                    (realtor_user_id, task_id, points, usd_value, type, status, description)
                VALUES (:uid, :task_id, :pts, :usd, 'earned', 'available', :desc)
            """), {
                "uid": task.realtor_user_id,
                "task_id": task_id,
                "pts": realtor_points,
                "usd": usd,
                "desc": f"Task #{task_id} approved by investor (70% cut of {task.reward_points} pts)",
            })
            
        # Push photos to public attachments
        from app.api.api_v1.endpoints.realtor_tasks import _copy_task_photos_to_attachments
        _copy_task_photos_to_attachments(task_id, task.property_id, task.investor_user_id, db)
    else:
        # Reject: task goes back to 'claimed' so realtor can resubmit
        db.execute(text("""
            UPDATE realtor_tasks SET status = 'claimed' WHERE id = :id
        """), {"id": task_id})

    db.commit()

    # Trigger Task Update Email to the Realtor
    if task.realtor_user_id:
        realtor = db.execute(text("SELECT email, full_name FROM users WHERE id = :id"), {"id": task.realtor_user_id}).fetchone()
        if realtor:
            email_body = get_task_update_template(
                task_title=task.title,
                status=review_status,
                updated_by=current_user.full_name or "Investor"
            )
            background_tasks.add_task(
                send_email,
                subject=f"Task Update: {task.title} is {review_status.upper()}",
                recipients=[realtor.email],
                body=email_body
            )

    return {"ok": True, "review_status": review_status}


# ── Task Edit & Delete ─────────────────────────────────────────────────────

class UpdateTaskPayload(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    min_photos: Optional[int] = None
    max_photos: Optional[int] = None
    reward_points: Optional[int] = None


@router.put("/tasks/{task_id}")
def update_task(
    task_id: int,
    payload: UpdateTaskPayload,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Investor edits a task they created.
    - open  → free to edit/delete
    - claimed → allowed; realtor loses claim + receives notification + must re-accept
    - submitted / approved → blocked
    """
    task = db.execute(text("SELECT * FROM realtor_tasks WHERE id = :id"), {"id": task_id}).fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.investor_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your task.")
    if task.status in ("submitted", "approved"):
        raise HTTPException(
            status_code=409,
            detail="This task already has submissions. Use the review flow to reject it, then you can edit."
        )

    new_min = payload.min_photos if payload.min_photos is not None else task.min_photos
    new_max = payload.max_photos if payload.max_photos is not None else task.max_photos
    new_pts = payload.reward_points if payload.reward_points is not None else task.reward_points
    if new_min < MIN_PHOTOS:
        raise HTTPException(status_code=400, detail=f"Minimum photos must be at least {MIN_PHOTOS}.")
    if new_max > 10:
        raise HTTPException(status_code=400, detail="Maximum photos cannot exceed 10.")
    if new_min > new_max:
        raise HTTPException(status_code=400, detail="min_photos cannot exceed max_photos.")
    min_req = calculate_min_points(new_min)
    if new_pts < min_req:
        raise HTTPException(status_code=400, detail=f"Minimum reward for {new_min} photos is {min_req} pts.")

    updates: dict = {}
    if payload.title is not None:        updates["title"] = payload.title
    if payload.description is not None:  updates["description"] = payload.description
    if payload.min_photos is not None:   updates["min_photos"] = payload.min_photos
    if payload.max_photos is not None:   updates["max_photos"] = payload.max_photos
    if payload.reward_points is not None: updates["reward_points"] = payload.reward_points

    notify_realtor = False
    realtor_user_id = task.realtor_user_id

    if task.status == "claimed" and realtor_user_id:
        updates["status"] = "open"
        updates["realtor_user_id"] = None
        updates["claimed_at"] = None
        updates["deadline"] = None
        notify_realtor = True

    if updates:
        set_clause = ", ".join(f"{k} = :{k}" for k in updates)
        updates["task_id"] = task_id
        db.execute(text(f"UPDATE realtor_tasks SET {set_clause} WHERE id = :task_id"), updates)

    if notify_realtor and realtor_user_id:
        task_title = payload.title or task.title
        db.execute(text("""
            INSERT INTO notifications (user_id, type, message, is_read)
            VALUES (:uid, 'task_updated', :msg, FALSE)
        """), {
            "uid": realtor_user_id,
            "msg": f'The task "{task_title}" was updated by the investor and is now available again. Please review the new details and re-accept if you are still interested.',
        })

    db.commit()
    return {"ok": True, "reverted_to_open": notify_realtor, "realtor_notified": notify_realtor}


@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Investor deletes a task. Blocked if submissions exist.
    If claimed, notifies the realtor before deleting.
    """
    task = db.execute(text("SELECT * FROM realtor_tasks WHERE id = :id"), {"id": task_id}).fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.investor_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your task.")
    if task.status in ("submitted", "approved"):
        raise HTTPException(
            status_code=409,
            detail="Cannot delete a task with submissions. Review and reject it first."
        )

    if task.status == "claimed" and task.realtor_user_id:
        db.execute(text("""
            INSERT INTO notifications (user_id, type, message, is_read)
            VALUES (:uid, 'task_deleted', :msg, FALSE)
        """), {
            "uid": task.realtor_user_id,
            "msg": f'The task "{task.title}" was removed by the investor. This task is no longer available.',
        })

    db.execute(text("DELETE FROM realtor_tasks WHERE id = :id"), {"id": task_id})
    db.commit()
    return {"ok": True}


# ── Export Edit ──────────────────────────────────────────────────────────────

class UpdateExportPayload(BaseModel):
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None


@router.put("/exports/{export_id}")
def update_export(
    export_id: int,
    payload: UpdateExportPayload,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Investor updates contact info for an exported property."""
    export = db.execute(
        text("SELECT id, investor_user_id FROM property_exports WHERE id = :id"),
        {"id": export_id}
    ).fetchone()
    if not export:
        raise HTTPException(status_code=404, detail="Export not found")
    if export.investor_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your export.")

    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided.")
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["export_id"] = export_id
    db.execute(text(f"UPDATE property_exports SET {set_clause} WHERE id = :export_id"), updates)
    db.commit()
    return {"ok": True}


# ── Property Exports ─────────────────────────────────────────────────────────

@router.post("/exports")
def export_property(
    payload: ExportPropertyPayload,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Investor exports a property so realtors can see it in their listings."""
    from app.services.permission_service import PermissionService
    PermissionService.check_feature_access(db, current_user, "exports")

    existing = db.execute(
        text("SELECT id FROM property_exports WHERE property_id = :pid AND investor_user_id = :uid AND is_active = TRUE"),
        {"pid": payload.property_id, "uid": current_user.id}
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Property already exported.")

    row = db.execute(text("""
        INSERT INTO property_exports
            (property_id, investor_user_id, contact_name, contact_phone, contact_email, requested_sale_price, notes, is_active)
        VALUES (:pid, :uid, :name, :phone, :email, :sale_price, :notes, TRUE)
        RETURNING id
    """), {
        "pid": payload.property_id,
        "uid": current_user.id,
        "name": payload.contact_name or current_user.full_name,
        "phone": payload.contact_phone,
        "email": payload.contact_email or current_user.email,
        "sale_price": payload.requested_sale_price,
        "notes": payload.notes,
    }).fetchone()
    db.commit()
    return {"ok": True, "export_id": row.id}


@router.get("/exports")
def get_my_exports(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Investor sees their exported properties."""
    rows = db.execute(text("""
        SELECT e.*, p.address, p.state, p.county, p.parcel_id, p.assessed_value, p.amount_due
        FROM property_exports e
        JOIN property_details p ON p.id = e.property_id
        WHERE e.investor_user_id = :uid AND e.is_active = TRUE
        ORDER BY e.exported_at DESC
    """), {"uid": current_user.id}).fetchall()
    return [dict(r._mapping) for r in rows]


@router.delete("/exports/{export_id}")
def cancel_export(
    export_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Investor cancels an export (soft delete)."""
    db.execute(
        text("UPDATE property_exports SET is_active = FALSE WHERE id = :id AND investor_user_id = :uid"),
        {"id": export_id, "uid": current_user.id}
    )
    db.commit()
    return {"ok": True}


# ── Support Tickets ───────────────────────────────────────────────────────────

class SupportTicketPayload(BaseModel):
    subject: str
    message: str
    ticket_type: str = "general"   # 'bug', 'task_conflict', 'payment', 'general'
    task_id: Optional[int] = None


@router.post("/support")
def create_support_ticket(
    payload: SupportTicketPayload,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Any user (investor or realtor) creates a support ticket."""
    row = db.execute(text("""
        INSERT INTO support_tickets (user_id, task_id, subject, message, ticket_type, status)
        VALUES (:uid, :task_id, :subject, :message, :type, 'open')
        RETURNING id
    """), {
        "uid": current_user.id,
        "task_id": payload.task_id,
        "subject": payload.subject,
        "message": payload.message,
        "type": payload.ticket_type,
    }).fetchone()
    db.commit()
    return {"ok": True, "ticket_id": row.id}


@router.get("/support")
def get_my_tickets(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Returns all support tickets created by the current user."""
    rows = db.execute(text("""
        SELECT * FROM support_tickets WHERE user_id = :uid ORDER BY created_at DESC
    """), {"uid": current_user.id}).fetchall()
    return [dict(r._mapping) for r in rows]
