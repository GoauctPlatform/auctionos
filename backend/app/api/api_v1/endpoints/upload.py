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

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")

def get_s3_client():
    if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME]):
        return None
    return boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION
    )

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
    
    size = 0
    with open(file_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_SIZE:
                os.remove(file_path)
                raise HTTPException(status_code=400, detail="File too large. Maximum size is 15MB.")
            buffer.write(chunk)
            
    # In a real setup, you might serve this statically or return a URL to a GET endpoint
    file_url = f"/uploads/{unique_filename}"
    return {"url": file_url, "filename": unique_filename, "status": "success"}

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
    s3_client = get_s3_client()
    if not s3_client:
        raise HTTPException(status_code=501, detail="S3 is not configured on the server. Use /local upload instead.")
        
    unique_filename = f"verifications/{current_user.id}_{uuid4()}_{filename}"
    
    try:
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': AWS_BUCKET_NAME,
                'Key': unique_filename,
                'ContentType': file_type,
            },
            ExpiresIn=3600  # 1 hour
        )
    except NoCredentialsError:
        raise HTTPException(status_code=500, detail="Invalid AWS credentials.")
        
    # The final URL of the object once uploaded
    file_url = f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{unique_filename}"
    
    return {
        "presigned_url": presigned_url,
        "file_url": file_url,
        "filename": unique_filename,
        "status": "success"
    }
