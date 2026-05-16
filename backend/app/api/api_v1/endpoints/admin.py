from fastapi import APIRouter, File, UploadFile, BackgroundTasks, HTTPException, Depends
from typing import Any
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

