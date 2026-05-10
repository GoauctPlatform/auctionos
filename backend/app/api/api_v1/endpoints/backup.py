import os
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.models.backup_job import BackupJob
from app.tasks import perform_database_backup_task

router = APIRouter()

@router.post("/trigger")
def trigger_backup(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Trigger a manual database backup.
    Requires admin privileges.
    """
    if current_user.role not in ('manager', 'admin', 'superuser'):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    job = BackupJob(
        filename="pending",
        file_path="pending",
        status="pending"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Spawn background task
    perform_database_backup_task.delay(job.id)

    return {"ok": True, "job_id": job.id, "message": "Backup job triggered successfully."}

@router.get("/jobs")
def get_backup_jobs(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve history of backup jobs.
    Requires admin privileges.
    """
    if current_user.role not in ('manager', 'admin', 'superuser'):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    jobs = db.query(BackupJob).order_by(BackupJob.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": j.id,
            "filename": j.filename,
            "file_size_bytes": j.file_size_bytes,
            "status": j.status,
            "error_message": j.error_message,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
        }
        for j in jobs
    ]

@router.get("/download/{job_id}")
def download_backup(
    job_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Download the generated SQL dump file.
    Requires admin privileges.
    """
    if current_user.role not in ('manager', 'admin', 'superuser'):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    job = db.query(BackupJob).filter(BackupJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job.status != "success":
        raise HTTPException(status_code=400, detail=f"Job is not in success state. Current status: {job.status}")

    if not os.path.exists(job.file_path):
        raise HTTPException(status_code=404, detail="Backup file not found on disk")

    return FileResponse(
        path=job.file_path, 
        filename=job.filename,
        media_type="application/sql"
    )
