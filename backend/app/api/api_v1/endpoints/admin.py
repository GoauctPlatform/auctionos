from fastapi import APIRouter, File, UploadFile, BackgroundTasks, HTTPException, Depends
from typing import Any, Optional
from pydantic import BaseModel
import uuid
import os
from app.services.import_service import import_service
from app.core.email import send_email
from app.core.email_templates import get_partner_decision_template
from app.api import deps
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter()
redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
import redis
redis_client = redis.Redis.from_url(redis_url)


# ─── Platform Stats ─────────────────────────────────────────────────────────

@router.get("/stats")
def get_admin_stats(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Return live platform KPIs for the admin dashboard."""
    if current_user.role not in ("admin", "superuser"):
        raise HTTPException(status_code=403, detail="Admin access required")

    from app.db.session import SessionLocal
    from sqlalchemy import text

    db = SessionLocal()
    try:
        rows = db.execute(text("""
            SELECT
                (SELECT COUNT(*) FROM property_details) AS total_properties,
                (SELECT COUNT(*) FROM property_details WHERE LOWER(availability_status) = 'available') AS available_properties,
                (SELECT COUNT(*) FROM auction_events) AS total_auctions,
                (SELECT COUNT(*) FROM auction_events WHERE auction_date >= CURRENT_DATE) AS active_auctions,
                (SELECT COUNT(*) FROM auction_events WHERE LOWER(tax_status) LIKE '%%deed%%' OR LOWER(name) LIKE '%%deed%%') AS deed_count,
                (SELECT COUNT(*) FROM auction_events WHERE LOWER(tax_status) LIKE '%%foreclosure%%' OR LOWER(name) LIKE '%%foreclosure%%') AS foreclosure_count,
                (SELECT COUNT(*) FROM auction_events WHERE LOWER(tax_status) LIKE '%%lien%%' OR LOWER(name) LIKE '%%lien%%') AS lien_count,
                (SELECT COUNT(*) FROM users WHERE LOWER(subscription_tier) = 'trial' AND is_active = TRUE AND role = 'client') AS trial_users,
                (SELECT COUNT(*) FROM users WHERE LOWER(subscription_tier) = 'pro' AND is_active = TRUE AND role = 'client') AS pro_users,
                (SELECT COUNT(*) FROM users WHERE LOWER(subscription_tier) = 'enterprise' AND is_active = TRUE AND role = 'client') AS enterprise_users,
                (SELECT COUNT(*) FROM users WHERE is_active = TRUE AND role NOT IN ('admin', 'superuser')) AS total_active_users
        """)).fetchone()

        return dict(rows._mapping) if rows else {}
    finally:
        db.close()


@router.post("/import/properties")
async def import_properties(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Must be a CSV file")
        
    job_id = str(uuid.uuid4())
    temp_dir = "/app/data/temp_imports"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = f"{temp_dir}/{job_id}.csv"
    
    # Save file to shared volume for worker access
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    redis_client.set(f"import_status:{job_id}", "pending", ex=3600)
    
    # IMPORT TASK: Move to Celery instead of FastAPI BackgroundTasks
    from app.tasks import import_properties_celery_task
    import_properties_celery_task.delay(file_path, job_id)
    
    return {"message": "Import started", "job_id": job_id}

@router.post("/import/auctions")
async def import_auctions(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Must be a CSV file")
        
    job_id = str(uuid.uuid4())
    content = await file.read()
    
    redis_client.set(f"import_auctions_status:{job_id}", "pending", ex=3600)
    background_tasks.add_task(import_service.process_auctions_csv, content, job_id)
    
    return {"message": "Import started", "job_id": job_id}

@router.post("/import/history")
async def import_history(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Must be a CSV file")
        
    job_id = str(uuid.uuid4())
    content = await file.read()
    
    redis_client.set(f"import_history_status:{job_id}", "pending", ex=3600)
    background_tasks.add_task(import_service.process_history_mapping_csv, content, job_id)
    
    return {"message": "Import started", "job_id": job_id}

@router.get("/import/status/{job_id}")
async def get_import_status(
    job_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    status = redis_client.get(f"import_status:{job_id}")
    if status is None:
        status = redis_client.get(f"import_auctions_status:{job_id}")
    
    if status is None:
        status = redis_client.get(f"import_history_status:{job_id}")
        
    if status is None:
        raise HTTPException(status_code=404, detail="Job not found")
        
    return {"job_id": job_id, "status": status.decode('utf-8')}

@router.post("/trigger-auto-transition")
async def trigger_auto_transition(
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Manually triggers the background task that transitions properties from
    past auctions to 'unavailable'.
    """
    from app.services.status_updater import transition_past_auctions
    result = transition_past_auctions()
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    return result


# ─── Realtor Applications Management ──────────────────────────────────────

@router.get("/realtors")
def list_realtor_applications(
    status: str = None,     # e.g. 'pending', 'verified', 'rejected'
    limit: int = 50,
    skip: int = 0,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Admin: list all realtor applications."""
    from app.db.session import SessionLocal
    from sqlalchemy import text

    if current_user.role not in ("admin", "superuser"):
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    try:
        where = "WHERE verification_status = :status" if status else ""
        params: dict = {"limit": limit, "skip": skip}
        if status:
            params["status"] = status

        rows = db.execute(
            text(f"""
                SELECT c.*, u.email AS user_email, u.role AS user_role
                FROM realtors c
                LEFT JOIN users u ON c.user_id = u.id
                {where}
                ORDER BY c.created_at DESC
                LIMIT :limit OFFSET :skip
            """),
            params
        ).fetchall()

        return {
            "items": [dict(r._mapping) for r in rows],
            "total": len(rows),
        }
    finally:
        db.close()


@router.put("/realtors/{realtor_id}/verify")
def verify_realtor(
    realtor_id: int,
    body: dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Admin: approve or reject a realtor application."""
    from app.db.session import SessionLocal
    from sqlalchemy import text

    if current_user.role not in ("admin", "superuser"):
        raise HTTPException(status_code=403, detail="Admin access required")

    new_status = body.get("status", "verified")
    if new_status not in ("verified", "rejected", "pending"):
        raise HTTPException(status_code=400, detail="Invalid status. Use: verified, rejected, pending")

    db = SessionLocal()
    try:
        result = db.execute(
            text("UPDATE realtors SET verification_status = :s WHERE id = :id RETURNING id, name, email, verification_status"),
            {"s": new_status, "id": realtor_id}
        ).fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Realtor not found")

        # If approved: also update the linked user's role to 'realtor'
        if new_status == "verified":
            row = db.execute(text("SELECT user_id FROM realtors WHERE id = :id"), {"id": realtor_id}).fetchone()
            if row and row[0]:
                db.execute(text("UPDATE users SET role = 'realtor' WHERE id = :uid"), {"uid": row[0]})

        db.commit()

        # Notify User in Background
        # We need the user's email and name. 'result' only has realtor info.
        background_tasks.add_task(
            _notify_partner_decision, 
            result.name, result.email, "realtor", new_status
        )

        return dict(result._mapping)
    finally:
        db.close()


@router.delete("/realtors/{realtor_id}")
def delete_realtor_application(
    realtor_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Admin: delete a realtor application."""
    from app.db.session import SessionLocal
    from sqlalchemy import text

    if current_user.role not in ("admin", "superuser"):
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    try:
        result = db.execute(
            text("DELETE FROM realtors WHERE id = :id RETURNING id"),
            {"id": realtor_id}
        ).fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Realtor not found")
        db.commit()
        return {"deleted": realtor_id}
    finally:
        db.close()


@router.get("/agents")
def list_agent_applications(
    status: str = None,     # e.g. 'pending', 'verified', 'rejected'
    limit: int = 50,
    skip: int = 0,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Admin: list all agent applications."""
    from app.db.session import SessionLocal
    from sqlalchemy import text

    if current_user.role not in ("admin", "superuser"):
        raise HTTPException(status_code=403, detail="Admin access required")

    db = SessionLocal()
    try:
        where = "WHERE verification_status = :status" if status else ""
        params: dict = {"limit": limit, "skip": skip}
        if status:
            params["status"] = status

        rows = db.execute(
            text(f"""
                SELECT a.*, u.email AS user_email, u.role AS user_role
                FROM agent_due_diligence_profiles a
                LEFT JOIN users u ON a.user_id = u.id
                {where}
                ORDER BY a.created_at DESC
                LIMIT :limit OFFSET :skip
            """),
            params
        ).fetchall()

        return {
            "items": [dict(r._mapping) for r in rows],
            "total": len(rows),
        }
    finally:
        db.close()


@router.put("/agents/{agent_id}/verify")
def verify_agent(
    agent_id: int,
    body: dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Admin: approve or reject an agent application."""
    from app.db.session import SessionLocal
    from sqlalchemy import text

    if current_user.role not in ("admin", "superuser"):
        raise HTTPException(status_code=403, detail="Admin access required")

    new_status = body.get("status", "verified")
    if new_status not in ("verified", "rejected", "pending"):
        raise HTTPException(status_code=400, detail="Invalid status.")

    db = SessionLocal()
    try:
        result = db.execute(
            text("UPDATE agent_due_diligence_profiles SET verification_status = :s WHERE id = :id RETURNING id, user_id, verification_status"),
            {"s": new_status, "id": agent_id}
        ).fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Agent profile not found")

        # If approved: update the linked user's role
        if new_status == "verified":
            db.execute(text("UPDATE users SET role = 'agent_due_diligence' WHERE id = :uid"), {"uid": result.user_id})

        db.commit()

        # Notify User in Background
        user = db.execute(text("SELECT email, full_name FROM users WHERE id = :uid"), {"uid": result.user_id}).fetchone()
        if user:
            background_tasks.add_task(
                _notify_partner_decision, 
                user.full_name or "Partner", user.email, "agent", new_status
            )

        return dict(result._mapping)
    finally:
        db.close()


async def _notify_partner_decision(name: str, email: str, role: str, status: str):
    """Helper to send approval/rejection email."""
    if status not in ("verified", "rejected"):
        return
        
    email_body = get_partner_decision_template(name, role, status)
    subject = f"GoAuct Application: {status.capitalize()}"
    await send_email(
        subject=subject,
        recipients=[email],
        body=email_body
    )


# ─── BPO Task Mediation Endpoints ──────────────────────────────────────────

@router.get("/support-tickets")
def list_support_tickets(
    status: Optional[str] = None,
    type: Optional[str] = None,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Admin: list all BPO mediation tickets."""
    if current_user.role not in ("admin", "superuser"):
        raise HTTPException(status_code=403, detail="Admin access required")

    from app.db.session import SessionLocal
    from sqlalchemy import text

    db = SessionLocal()
    try:
        where_clauses = []
        params = {}
        if status:
            where_clauses.append("status = :status")
            params["status"] = status
        if type:
            where_clauses.append("ticket_type = :type")
            params["type"] = type

        where_str = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        rows = db.execute(text(f"""
            SELECT * FROM support_tickets
            {where_str}
            ORDER BY created_at DESC
        """), params).fetchall()

        return [dict(r._mapping) for r in rows]
    finally:
        db.close()


@router.get("/realtor-tasks/{task_id}")
def get_task_for_mediation(
    task_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Admin: view details of a disputed task for mediation."""
    if current_user.role not in ("admin", "superuser"):
        raise HTTPException(status_code=403, detail="Admin access required")

    from app.db.session import SessionLocal
    from sqlalchemy import text

    db = SessionLocal()
    try:
        task = db.execute(text("""
            SELECT t.*, t.address AS property_address
            FROM realtor_tasks t
            WHERE t.id = :task_id
        """), {"task_id": task_id}).fetchone()

        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        # Get latest submission details
        sub = db.execute(text("""
            SELECT s.geo_validated, s.distance_meters, s.file_path, s.checklist_responses, s.notes AS agent_notes
            FROM task_submissions s
            WHERE s.task_id = :task_id
            ORDER BY s.submitted_at DESC
            LIMIT 1
        """), {"task_id": task_id}).fetchone()

        task_dict = dict(task._mapping)
        if sub:
            task_dict["geo_validated"] = sub.geo_validated
            task_dict["distance_meters"] = sub.distance_meters
            task_dict["checklist_responses"] = sub.checklist_responses
            task_dict["agent_notes"] = sub.agent_notes
            photos = sub.file_path.split(",") if sub.file_path else []
            task_dict["submission_photos"] = photos
        else:
            task_dict["geo_validated"] = False
            task_dict["distance_meters"] = 0
            task_dict["checklist_responses"] = None
            task_dict["agent_notes"] = None
            task_dict["submission_photos"] = []

        return task_dict
    finally:
        db.close()


class ResolveTicketPayload(BaseModel):
    decision: str  # 'approve_realtor' or 'refund_investor'
    notes: str


@router.post("/support-tickets/{ticket_id}/resolve")
def resolve_support_ticket(
    ticket_id: int,
    payload: ResolveTicketPayload,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Admin: resolve a task conflict mediation ticket."""
    if current_user.role not in ("admin", "superuser"):
        raise HTTPException(status_code=403, detail="Admin access required")

    from app.db.session import SessionLocal
    from sqlalchemy import text

    db = SessionLocal()
    try:
        # Fetch support ticket
        ticket = db.execute(text("""
            SELECT * FROM support_tickets WHERE id = :id
        """), {"id": ticket_id}).fetchone()
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Mediation ticket not found")

        task_id = ticket.task_id
        if not task_id:
            raise HTTPException(status_code=400, detail="Ticket is not associated with a task")

        # Fetch realtor task
        task = db.execute(text("""
            SELECT * FROM realtor_tasks WHERE id = :id
        """), {"id": task_id}).fetchone()

        if not task:
            raise HTTPException(status_code=404, detail="Associated task not found")

        if payload.decision == "approve_realtor":
            # 1. Update Realtor Task
            db.execute(text("""
                UPDATE realtor_tasks
                SET status = 'approved', approved_at = NOW()
                WHERE id = :id
            """), {"id": task_id})

            # 2. Update Latest Submission
            db.execute(text("""
                UPDATE task_submissions
                SET review_status = 'approved', review_notes = :notes, reviewed_at = NOW()
                WHERE id = (
                    SELECT id FROM task_submissions
                    WHERE task_id = :task_id
                    ORDER BY submitted_at DESC
                    LIMIT 1
                )
            """), {"notes": payload.notes, "task_id": task_id})

            # 3. Credit Realtor
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
                    "desc": f"Task #{task_id} approved by admin mediation",
                })

            # 4. Copy photos to public property attachments
            from app.api.api_v1.endpoints.realtor_tasks import _copy_task_photos_to_attachments
            _copy_task_photos_to_attachments(task_id, task.property_id, task.investor_user_id, db)

        elif payload.decision == "refund_investor":
            # 1. Update Realtor Task
            db.execute(text("""
                UPDATE realtor_tasks
                SET status = 'rejected'
                WHERE id = :id
            """), {"id": task_id})

            # 2. Update Latest Submission
            db.execute(text("""
                UPDATE task_submissions
                SET review_status = 'rejected', review_notes = :notes, reviewed_at = NOW()
                WHERE id = (
                    SELECT id FROM task_submissions
                    WHERE task_id = :task_id
                    ORDER BY submitted_at DESC
                    LIMIT 1
                )
            """), {"notes": payload.notes, "task_id": task_id})

            # 3. Process Stripe Refund
            from app.core.config import settings
            if settings.STRIPE_SECRET_KEY and task.stripe_charge_id:
                try:
                    from app.api.api_v1.endpoints.billing import get_stripe
                    stripe = get_stripe()
                    # Retrieve Checkout Session to get Payment Intent ID
                    session = stripe.checkout.Session.retrieve(task.stripe_charge_id)
                    if session.payment_intent:
                        stripe.Refund.create(
                            payment_intent=session.payment_intent,
                            reason="requested_by_customer"
                        )
                except Exception as stripe_err:
                    print(f"Stripe Refund failed: {stripe_err}")
        else:
            raise HTTPException(status_code=400, detail="Invalid decision type")

        # 4. Insert Audit History into activity_logs
        import json
        metadata_log = {
            "ticket_id": ticket_id,
            "task_id": task_id,
            "decision": payload.decision,
            "admin_notes": payload.notes,
            "investor_id": task.investor_user_id,
            "realtor_id": task.realtor_user_id,
            "amount_points": task.reward_points
        }
        db.execute(text("""
            INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, metadata_json, created_at)
            VALUES (:uid, :act, 'support_ticket', :ticket_id, :det, :meta, NOW())
        """), {
            "uid": current_user.id,
            "act": "task_mediation_resolution",
            "ticket_id": str(ticket_id),
            "det": f"Admin resolved mediation ticket #{ticket_id} for task #{task_id}. Decision: {payload.decision}.",
            "meta": json.dumps(metadata_log)
        })

        # Update Support Ticket status
        db.execute(text("""
            UPDATE support_tickets
            SET status = 'resolved', admin_response = :notes, responded_at = NOW()
            WHERE id = :id
        """), {"notes": payload.notes, "id": ticket_id})

        # 5. Notify both Realtor and Investor of Admin Mediation Decision
        from app.core.email import send_email
        from app.core.email_templates import get_task_mediation_resolved_template
        
        # Notify Realtor
        if task.realtor_user_id:
            realtor = db.execute(text("SELECT email, full_name FROM users WHERE id = :id"), {"id": task.realtor_user_id}).fetchone()
            if realtor:
                realtor_body = get_task_mediation_resolved_template(
                    user_name=realtor.full_name or "Agent",
                    task_title=task.title,
                    decision=payload.decision,
                    admin_notes=payload.notes
                )
                background_tasks.add_task(
                    send_email,
                    subject=f"Mediation Decision: {task.title}",
                    recipients=[realtor.email],
                    body=realtor_body
                )
        
        # Notify Investor
        if task.investor_user_id:
            investor = db.execute(text("SELECT email, full_name FROM users WHERE id = :id"), {"id": task.investor_user_id}).fetchone()
            if investor:
                investor_body = get_task_mediation_resolved_template(
                    user_name=investor.full_name or "Investor",
                    task_title=task.title,
                    decision=payload.decision,
                    admin_notes=payload.notes
                )
                background_tasks.add_task(
                    send_email,
                    subject=f"Mediation Decision: {task.title}",
                    recipients=[investor.email],
                    body=investor_body
                )

        db.commit()
        return {"ok": True, "message": "Conflict successfully resolved"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
