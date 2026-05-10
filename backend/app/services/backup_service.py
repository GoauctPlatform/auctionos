import os
import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.backup_job import BackupJob

logger = logging.getLogger(__name__)

BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "backups")

async def run_backup(job_id: int, db: Session):
    """
    Executes pg_dump via subprocess and updates the BackupJob.
    This should be called from a Celery task.
    """
    job = db.query(BackupJob).filter(BackupJob.id == job_id).first()
    if not job:
        logger.error(f"Backup job {job_id} not found.")
        return

    job.status = "running"
    db.commit()

    os.makedirs(BACKUP_DIR, exist_ok=True)
    
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.sql"
    file_path = os.path.join(BACKUP_DIR, filename)

    job.filename = filename
    job.file_path = file_path
    db.commit()

    db_url = settings.DATABASE_URL
    if not db_url.startswith("postgres"):
        # Not a postgres database, mark as failed
        job.status = "failed"
        job.error_message = "Configured database is not PostgreSQL."
        job.completed_at = datetime.now(timezone.utc)
        db.commit()
        return

    # To avoid command injection, we use pg_dump directly with the URL format
    # Note: the url is passed directly to pg_dump
    command = f'pg_dump --dbname="{db_url}" -F p -f "{file_path}"'
    
    try:
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            job.status = "success"
            if os.path.exists(file_path):
                job.file_size_bytes = os.path.getsize(file_path)
        else:
            job.status = "failed"
            job.error_message = stderr.decode()[:2000]
            logger.error(f"Backup failed: {stderr.decode()}")
            
    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
        logger.error(f"Backup execution error: {e}")
        
    finally:
        job.completed_at = datetime.now(timezone.utc)
        db.commit()
