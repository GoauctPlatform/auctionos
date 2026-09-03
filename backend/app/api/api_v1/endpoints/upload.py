import os
import boto3
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from botocore.exceptions import NoCredentialsError

from app.api import deps
from app.models.user import User

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../../uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

from app.services.storage_service import storage_service

@router.post("/local")
async def upload_local(
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Upload a document directly to the backend (Local Storage).
    This serves as the fallback method.
    """
    MAX_SIZE = 15 * 1024 * 1024  # 15MB
    ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension {file_ext} not allowed")

    unique_filename = f"{current_user.id}_{uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    s3_path = f"local-uploads/{unique_filename}"
    try:
        storage_service.upload_file(file, s3_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
            
    # Serve via presigned URL or direct path based on configuration
    file_url = storage_service.get_presigned_url(s3_path)
    return {"url": file_url, "filename": unique_filename, "s3_key": s3_path, "status": "success"}

@router.get("/presigned-url")
def get_presigned_url(
    filename: str,
    file_type: str,
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Generate a presigned S3 URL for secure direct upload from the frontend.
    Requires AWS credentials to be configured in the backend environment.
    """
    unique_filename = f"verifications/{current_user.id}_{uuid4()}_{filename}"
    
    presigned_url = storage_service.get_presigned_upload_url(unique_filename, file_type)
    if not presigned_url:
        raise HTTPException(status_code=501, detail="S3 is not configured on the server.")
        
    # The final URL of the object once uploaded
    file_url = storage_service.get_presigned_url(unique_filename)
    
    return {
        "presigned_url": presigned_url,
        "file_url": file_url,
        "filename": unique_filename,
        "s3_key": unique_filename,
        "status": "success"
    }
