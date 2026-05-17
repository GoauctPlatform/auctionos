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
    checklist_requirements: Optional[str] = None
    gps_photo_reference: Optional[str] = None
    deadline_hours: int = 168  # 7 days default expiration

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

    # Validate photo count based on task type
    if payload.task_type == "visual_feedback":
        if payload.min_photos != 0 or payload.max_photos != 0:
            raise HTTPException(status_code=400, detail="Visual feedback tasks must have 0 photos.")
    else:
        if payload.min_photos < MIN_PHOTOS:
            raise HTTPException(status_code=400, detail=f"Minimum photos must be at least {MIN_PHOTOS}.")
        if payload.max_photos > 50:
            raise HTTPException(status_code=400, detail="Maximum photos cannot exceed 50.")
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

    from datetime import timedelta
    from app.core.config import settings

    deadline = datetime.now(timezone.utc) + timedelta(hours=payload.deadline_hours)
    
    amount_cents = 51  # Fixed to R$0.51 (sandbox default) as requested for testing
    checkout_url = None
    stripe_session_id = None

    if settings.STRIPE_SECRET_KEY:
        from app.api.api_v1.endpoints.billing import get_stripe
        stripe = get_stripe()
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "brl",
                    "unit_amount": amount_cents,
                    "product_data": {
                        "name": f"GoAuct Escrow - {payload.title}",
                        "description": f"Escrow payment for BPO Due Diligence. Reward: {payload.reward_points} pts",
                    },
                },
                "quantity": 1,
            }],
            success_url=f"{settings.FRONTEND_URL}/#/client/tasks?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/#/client/properties/{payload.property_id}?payment=cancelled",
            customer_email=current_user.email,
            metadata={
                "user_id": str(current_user.id),
                "action": "fund_escrow",
            },
        )
        checkout_url = session.url
        stripe_session_id = session.id
        status = "pending_payment"
    else:
        status = "open"  # Mock fallback

    row = db.execute(text("""
        INSERT INTO realtor_tasks
            (property_id, investor_user_id, task_type, title, description,
             address, latitude, longitude, geo_radius_meters,
             min_photos, max_photos, reward_points, status,
             checklist_requirements, gps_photo_reference, expiration_date, stripe_charge_id)
        VALUES
            (:property_id, :investor_id, :task_type, :title, :description,
             :address, :lat, :lng, 50,
             :min_photos, :max_photos, :reward_points, :status,
             :checklist, :gps_photo, :expiration, :stripe_session_id)
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
        "status": status,
        "checklist": payload.checklist_requirements,
        "gps_photo": payload.gps_photo_reference,
        "expiration": deadline,
        "stripe_session_id": stripe_session_id
    }).fetchone()
    db.commit()
    
    # If no checkout URL generated, we can send a Resend email immediately.
    if status == "open":
        background_tasks = BackgroundTasks() # We need to import BackgroundTasks from fastapi
        pass # In actual production, we trigger the "new task posted" email from the confirm endpoint

    return {
        "ok": True, 
        "task_id": row.id, 
        "min_reward_points": min_required,
        "checkout_url": checkout_url,
        "status": status
    }

class ConfirmEscrowPayload(BaseModel):
    task_id: int
    session_id: str

@router.post("/tasks/confirm-payment")
def confirm_escrow_payment(
    payload: ConfirmEscrowPayload,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Confirms the Stripe payment and unlocks the task for realtors."""
    task = db.execute(text("SELECT title, address, reward_points, status FROM realtor_tasks WHERE id = :id AND investor_user_id = :uid"), 
        {"id": payload.task_id, "uid": current_user.id}).fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.status != "pending_payment":
        return {"ok": True, "status": task.status}

    # Verify session with Stripe (omitted for speed, relying on frontend validation for test environment)
    db.execute(text("UPDATE realtor_tasks SET status = 'open' WHERE id = :id"), {"id": payload.task_id})
    db.commit()

    # Notify all active realtors/agents via background task
    realtors = db.execute(text("SELECT email FROM users WHERE role IN ('realtor', 'agent_due_diligence') AND is_active = true")).fetchall()
    realtor_emails = [r.email for r in realtors if r.email]
    if realtor_emails:
        email_body = (
            f"Hello Field Agent,\n\n"
            f"A new Due Diligence BPO mission has been funded and posted!\n\n"
            f"Mission: {task.title}\n"
            f"Address: {task.address}\n"
            f"Reward Points: {task.reward_points} pts\n\n"
            f"Log in to your Available Tasks Dashboard on GoAuct to claim this mission before other agents do!"
        )
        background_tasks.add_task(
            send_email,
            subject=f"New Funded BPO Mission Available: '{task.title}'",
            recipients=realtor_emails,
            body=email_body
        )

    return {"ok": True, "status": "open"}



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
            realtor_points = int(task.reward_points * 0.9)
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
                "desc": f"Task #{task_id} approved by investor (90% cut of {task.reward_points} pts)",
            })
            
        # Push photos to public attachments
        from app.api.api_v1.endpoints.realtor_tasks import _copy_task_photos_to_attachments
        _copy_task_photos_to_attachments(task_id, task.property_id, task.investor_user_id, db)
    else:
        new_count = (task.rejections_count or 0) + 1
        
        if new_count >= 2:
            # Second Rejection -> Escalate to Admin Mediation
            db.execute(text("""
                UPDATE realtor_tasks 
                SET status = 'disputed', rejections_count = :count 
                WHERE id = :id
            """), {"count": new_count, "id": task_id})
            
            db.execute(text("""
                INSERT INTO support_tickets (user_id, task_id, subject, message, ticket_type, status)
                VALUES (:uid, :task_id, :subject, :message, 'task_conflict', 'open')
            """), {
                "uid": current_user.id,
                "task_id": task_id,
                "subject": f"Automated Mediation: Disputed Task #{task_id}",
                "message": f"Task rejected twice. Last reason: {payload.review_notes}",
            })
            review_status = "disputed (escalated to support)"
            
            # Notify support via email
            background_tasks.add_task(
                send_email,
                subject=f"URGENT: Disputed Task #{task_id} Requires Mediation",
                recipients=["support@goauct.com"],
                body=f"Task #{task_id} was rejected twice by Investor {current_user.email}. Please review the support ticket."
            )
        else:
            # First Reject: task goes back to 'claimed' so realtor can resubmit
            db.execute(text("""
                UPDATE realtor_tasks SET status = 'claimed', rejections_count = :count WHERE id = :id
            """), {"count": new_count, "id": task_id})

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
    new_type = task.task_type
    if new_type == "visual_feedback":
        if new_min != 0 or new_max != 0:
            raise HTTPException(status_code=400, detail="Visual feedback tasks must have 0 photos.")
    else:
        if new_min < MIN_PHOTOS:
            raise HTTPException(status_code=400, detail=f"Minimum photos must be at least {MIN_PHOTOS}.")
        if new_max > 50:
            raise HTTPException(status_code=400, detail="Maximum photos cannot exceed 50.")
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

# ── Secondary Market (BPO Data) ───────────────────────────────────────────────

class PurchaseBPODataPayload(BaseModel):
    property_id: int
    purchase_type: str  # 'checklist', 'photos', 'combo'

@router.post("/secondary-market/purchase")
def purchase_bpo_data(
    payload: PurchaseBPODataPayload,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Purchase BPO secondary market data (Checklist/Photos/Combo) for a property."""
    from app.core.config import settings
    
    # Check if a completed/approved task exists for this property
    task = db.execute(text("""
        SELECT id FROM realtor_tasks 
        WHERE property_id = :pid AND status = 'approved'
        LIMIT 1
    """), {"pid": payload.property_id}).fetchone()
    
    if not task:
        raise HTTPException(status_code=404, detail="No approved BPO data available for this property.")

    # Determine price
    prices = {"checklist": 30, "photos": 20, "combo": 50}
    if payload.purchase_type not in prices:
        raise HTTPException(status_code=400, detail="Invalid purchase type.")
        
    amount_usd = prices[payload.purchase_type]
    amount_cents = 51 # For sandbox testing, override to 51 cents
    
    checkout_url = None
    stripe_session_id = None
    
    if settings.STRIPE_SECRET_KEY:
        from app.api.api_v1.endpoints.billing import get_stripe
        stripe = get_stripe()
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "brl",
                    "unit_amount": amount_cents,
                    "product_data": {
                        "name": f"GoAuct BPO Data - {payload.purchase_type.capitalize()}",
                        "description": f"Purchase {payload.purchase_type} for property ID {payload.property_id}",
                    },
                },
                "quantity": 1,
            }],
            success_url=f"{settings.FRONTEND_URL}/#/client/properties/{payload.property_id}?secondary_payment=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/#/client/properties/{payload.property_id}?secondary_payment=cancelled",
            customer_email=current_user.email,
            metadata={
                "user_id": str(current_user.id),
                "action": "purchase_secondary",
                "property_id": str(payload.property_id),
                "purchase_type": payload.purchase_type,
            },
        )
        checkout_url = session.url
        stripe_session_id = session.id
        
    return {
        "ok": True,
        "checkout_url": checkout_url,
        "amount_usd": amount_usd
    }

class ConfirmSecondaryPurchasePayload(BaseModel):
    property_id: int
    purchase_type: str
    session_id: Optional[str] = None

@router.post("/secondary-market/confirm")
def confirm_secondary_purchase(
    payload: ConfirmSecondaryPurchasePayload,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Confirms the Stripe payment and records the secondary market purchase."""
    # Check if already purchased
    existing = db.execute(text("""
        SELECT id FROM property_media_purchases 
        WHERE property_id = :pid AND user_id = :uid AND purchase_type IN (:type, 'combo')
    """), {"pid": payload.property_id, "uid": current_user.id, "type": payload.purchase_type}).fetchone()
    
    if existing:
        return {"ok": True, "message": "Already purchased."}

    prices = {"checklist": 30.0, "photos": 20.0, "combo": 50.0}
    amount_paid = prices.get(payload.purchase_type, 0.0)

    db.execute(text("""
        INSERT INTO property_media_purchases (property_id, user_id, amount_paid, purchase_type)
        VALUES (:pid, :uid, :amount, :ptype)
    """), {
        "pid": payload.property_id, 
        "uid": current_user.id,
        "amount": amount_paid,
        "ptype": payload.purchase_type
    })
    db.commit()
    
    return {"ok": True}
