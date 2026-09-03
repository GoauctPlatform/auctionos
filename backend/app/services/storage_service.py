import os
import boto3
from botocore.client import Config
from fastapi import UploadFile

# We load environment variables or use the explicit ones provided by the user.
SUPABASE_S3_ACCESS_KEY_ID = os.getenv("SUPABASE_S3_ACCESS_KEY_ID", "697813fc91123c061f888b4aad53d0f4")
SUPABASE_S3_SECRET_ACCESS_KEY = os.getenv("SUPABASE_S3_SECRET_ACCESS_KEY", "79bf44caf38b9c09017133ad2458ed40df48004dede9c5e7dee91d2360d95aa5")
SUPABASE_S3_ENDPOINT = os.getenv("SUPABASE_S3_ENDPOINT", "https://chsavwbclbdlbfboktok.storage.supabase.co/storage/v1/s3")
SUPABASE_S3_BUCKET = os.getenv("SUPABASE_S3_BUCKET", "goauct-storage")
SUPABASE_S3_REGION = os.getenv("SUPABASE_S3_REGION", "us-west-2")

def get_s3_client():
    if not SUPABASE_S3_ACCESS_KEY_ID or not SUPABASE_S3_SECRET_ACCESS_KEY:
        return None
    
    return boto3.client(
        's3',
        aws_access_key_id=SUPABASE_S3_ACCESS_KEY_ID,
        aws_secret_access_key=SUPABASE_S3_SECRET_ACCESS_KEY,
        region_name=SUPABASE_S3_REGION,
        endpoint_url=SUPABASE_S3_ENDPOINT,
        config=Config(signature_version='s3v4')
    )

class StorageService:
    @staticmethod
    def upload_file(file: UploadFile, s3_path: str, content_type: str = None) -> str:
        """
        Uploads a FastAPI UploadFile to Supabase S3.
        Returns the s3_path if successful, otherwise raises an Exception.
        """
        client = get_s3_client()
        if not client:
            raise Exception("Storage client is not configured")
        
        if not content_type:
            content_type = file.content_type or 'application/octet-stream'

        client.upload_fileobj(
            file.file, 
            SUPABASE_S3_BUCKET, 
            s3_path, 
            ExtraArgs={'ContentType': content_type}
        )
        return s3_path

    @staticmethod
    def get_presigned_url(s3_path: str, expires_in: int = 3600) -> str:
        """
        Generates a presigned URL to view/download a private object.
        Returns the original s3_path if it's already a URL or generation fails.
        """
        # If it's already an absolute URL or local path from legacy code, return it
        if not s3_path or s3_path.startswith("http") or s3_path.startswith("/uploads/"):
            return s3_path

        client = get_s3_client()
        if not client:
            return s3_path

        try:
            url = client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': SUPABASE_S3_BUCKET,
                    'Key': s3_path
                },
                ExpiresIn=expires_in
            )
            return url
        except Exception:
            return s3_path

    @staticmethod
    def get_presigned_upload_url(s3_path: str, content_type: str, expires_in: int = 3600) -> str:
        """
        Generates a presigned URL to allow direct uploads from the frontend.
        """
        client = get_s3_client()
        if not client:
            return ""

        try:
            url = client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': SUPABASE_S3_BUCKET,
                    'Key': s3_path,
                    'ContentType': content_type
                },
                ExpiresIn=expires_in
            )
            return url
        except Exception:
            return ""

storage_service = StorageService()
