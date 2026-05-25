import logging
import asyncio
from app.worker import celery_app
from app.db.session import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Helper to run async code in sync Celery task
def run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@celery_app.task(acks_late=True)
def scrape_county_task():
    """
    Background task to scrape county websites. (Temporarily disabled for migration)
    """
    logger.info("Scrape task disabled during architecture simplification.")
    return {"status": "success", "message": "Scrape disabled"}

@celery_app.task(acks_late=True)
def import_csv_task():
    """
    Background task to run the CSV migration/import logic. (Temporarily disabled for migration)
    """
    logger.info("CSV import task disabled during architecture simplification.")
    return {"status": "success"}

@celery_app.task(acks_late=True)
def resolve_property_auction_links_task(job_id: str):
    """
    Background trigger: Resolves loosely coupled text constraints into strong Foreign Key relations.
    """
    logger.info(f"Starting auction linkage resolution for job: {job_id}")
    try:
        from app.db.session import engine
        from sqlalchemy import text
        with engine.begin() as conn:
            query = text("""
                UPDATE property_auction_history pah
                SET auction_id = ae.id
                FROM auction_events ae
                WHERE pah.auction_id IS NULL 
                  AND (pah.auction_name = ae.name OR pah.auction_name = ae.short_name)
                  AND pah.auction_date = ae.auction_date;
            """)
            result = conn.execute(query)
            logger.info(f"Linkage complete. Rows updated: {result.rowcount}")
        return {"status": "success", "linked_rows": result.rowcount}
    except Exception as e:
        logger.error(f"Failed to resolve linkages: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(acks_late=True, name="app.tasks.reconcile_property_statuses_task")
def reconcile_property_statuses_task():
    """
    Automatic task to reconcile property statuses based on passed auction dates.
    Runs daily via Celery Beat.
    """
    logger.info("Starting automatic status reconciliation task.")
    from app.db.session import engine
    from sqlalchemy import text
    from datetime import datetime
    
    current_date = datetime.utcnow().date()
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    try:
        with engine.begin() as conn:
            # 1. Update status
            update_query = text("""
                UPDATE property_details p
                SET availability_status = 'unavailable'
                FROM property_auction_history pah
                WHERE p.property_id = pah.property_id
                  AND pah.auction_date < :current_date
                  AND p.availability_status = 'available';
            """)
            result = conn.execute(update_query, {"current_date": current_date})
            
            # 2. Log History
            if result.rowcount > 0:
                history_query = text("""
                    INSERT INTO property_availability_history (property_id, previous_status, new_status, change_source, changed_at)
                    SELECT p.property_id, 'available', 'unavailable', 'auto_reconciliation_past_auction', :now
                    FROM property_details p
                    JOIN property_auction_history pah ON p.property_id = pah.property_id
                    WHERE pah.auction_date < :current_date
                      AND p.availability_status = 'unavailable'
                      AND NOT EXISTS (
                          SELECT 1 FROM property_availability_history pah2 
                          WHERE pah2.property_id = p.property_id 
                          AND pah2.change_source = 'auto_reconciliation_past_auction'
                          AND pah2.changed_at > :today_start
                      );
                """)
                conn.execute(history_query, {"current_date": current_date, "now": now, "today_start": today_start})
                
            logger.info(f"Auto-reconciliation complete. Updated {result.rowcount} properties.")
            return {"status": "success", "updated_count": result.rowcount}
    except Exception as e:
        logger.error(f"Auto-reconciliation failed: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(acks_late=True, name="app.tasks.check_watchlists_task")
def check_watchlists_task():
    """
    Scans client lists for properties with upcoming auctions
    and generates notifications for users.
    """
    logger.info("Starting watchlist check task.")
    from app.db.session import engine
    from sqlalchemy import text
    from datetime import datetime, timedelta
    
    current_date = datetime.utcnow().date()
    target_date = current_date + timedelta(days=7)
    now = datetime.utcnow()
    
    try:
        with engine.begin() as conn:
            query = text("""
                SELECT 
                    cl.user_id, 
                    clp.property_id, 
                    pd.parcel_id, 
                    pah.auction_date, 
                    pah.auction_id,
                    pd.address
                FROM client_lists cl
                JOIN client_list_property clp ON cl.id = clp.list_id
                JOIN property_details pd ON clp.property_id = pd.id
                JOIN property_auction_history pah ON pd.property_id = pah.property_id
                WHERE pah.auction_date BETWEEN :current_date AND :target_date
                  AND LOWER(TRIM(pd.availability_status)) = 'available'
            """)
            results = conn.execute(query, {
                "current_date": current_date, 
                "target_date": target_date
            }).fetchall()
            
            notifications = []
            for row in results:
                user_id, property_pk, parcel_id, auction_date, auction_id, address = row
                
                days_left = (auction_date.date() - current_date).days if hasattr(auction_date, 'date') else (datetime.strptime(str(auction_date), "%Y-%m-%d").date() - current_date).days
                
                if days_left <= 2:
                    msg_type = "auction_starting_soon"
                    message = f"Auction starting soon! {address or parcel_id} is up for auction in {days_left} day(s)."
                else:
                    msg_type = "auction_approaching"
                    message = f"Auction approaching: {address or parcel_id} will be auctioned on {auction_date}."
                
                # Deduplicate: Check if a notification for this user, property, and auction_date already exists
                check_query = text("""
                    SELECT id FROM notifications 
                    WHERE user_id = :user_id 
                      AND property_id = :property_id 
                      AND type = :type 
                      AND DATE(created_at) = :today
                """)
                exists = conn.execute(check_query, {
                    "user_id": user_id, 
                    "property_id": parcel_id, 
                    "type": msg_type,
                    "today": current_date
                }).fetchone()
                
                if not exists:
                    insert_query = text("""
                        INSERT INTO notifications (user_id, type, message, property_id, auction_id, created_at)
                        VALUES (:user_id, :type, :message, :property_id, :auction_id, :now)
                    """)
                    conn.execute(insert_query, {
                        "user_id": user_id,
                        "type": msg_type,
                        "message": message,
                        "property_id": parcel_id,
                        "auction_id": auction_id,
                        "now": now
                    })
                    notifications.append(row)
                    
            logger.info(f"Watchlist check complete. Generated {len(notifications)} notifications.")
            return {"status": "success", "notifications_generated": len(notifications)}
    except Exception as e:
        logger.error(f"Watchlist check failed: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(acks_late=True, name="app.tasks.perform_database_backup_task")
def perform_database_backup_task(job_id: int):
    """
    Background task to execute a database backup.
    """
    logger.info(f"Starting database backup task for job: {job_id}")
    from app.services.backup_service import run_backup
    try:
        with SessionLocal() as db:
            run_async(run_backup(job_id, db))
        return {"status": "success", "job_id": job_id}
    except Exception as e:
        logger.error(f"Backup task failed: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(acks_late=True, name="app.tasks.revert_expired_tasks_task")
def revert_expired_tasks_task():
    """
    Scans for tasks that were claimed but not submitted before the deadline.
    Reverts them to 'open' (Available) and notifies the requester and support.
    """
    logger.info("Starting expired tasks check.")
    from app.db.session import engine
    from sqlalchemy import text
    from datetime import datetime
    from app.core.email import send_email
    
    now = datetime.utcnow()
    
    try:
        with engine.begin() as conn:
            # Find expired claimed tasks
            query = text("""
                SELECT t.id, t.title, t.investor_user_id, u.email as investor_email, u.full_name as investor_name
                FROM realtor_tasks t
                JOIN users u ON t.investor_user_id = u.id
                WHERE t.status = 'claimed' AND t.deadline < :now
            """)
            expired_tasks = conn.execute(query, {"now": now}).fetchall()
            
            if not expired_tasks:
                return {"status": "success", "reverted": 0}

            for task in expired_tasks:
                # Revert to open
                update_query = text("""
                    UPDATE realtor_tasks
                    SET status = 'open', realtor_user_id = NULL, claimed_at = NULL, deadline = NULL
                    WHERE id = :id
                """)
                conn.execute(update_query, {"id": task.id})
                
                # Notify requester
                send_email(
                    subject=f"Task Reverted to Available: {task.title}",
                    recipients=[task.investor_email],
                    body=f"Hello {task.investor_name or 'Investor'},\n\nYour task '{task.title}' was claimed but not completed by the deadline. We have reverted the task to 'Available' so another field agent can claim it.\n\nThank you,\nGoAuct Team"
                )
                
                # Notify support
                send_email(
                    subject=f"System Alert: Task {task.id} Expired",
                    recipients=["support@goauct.com"],
                    body=f"Task '{task.title}' (ID: {task.id}) claimed by an agent has expired without submission. It has been automatically reverted to 'open'."
                )
            
            logger.info(f"Reverted {len(expired_tasks)} expired tasks.")
            return {"status": "success", "reverted": len(expired_tasks)}
    except Exception as e:
        logger.error(f"Expired tasks check failed: {e}")
        return {"status": "error", "message": str(e)}

