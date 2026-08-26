import boto3
import uuid
import os
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

# ── S3 Client ─────────────────────────────────────────────────────────────────

# boto3.client creates a connection to AWS S3
# It reads credentials from environment variables automatically:
#   AWS_ACCESS_KEY_ID
#   AWS_SECRET_ACCESS_KEY
#   AWS_REGION
s3_client = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION", "ap-south-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

# Allowed file types for resume upload
ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
}

# Max file size: 5MB
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB in bytes


def validate_file(file_content_type: str, file_size: int) -> str:
    """
    Validates file type and size.
    Returns the file extension if valid.
    Raises HTTPException if invalid.
    """

    # Check file type
    if file_content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF and DOCX are allowed."
        )

    # Check file size
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is 5MB."
        )

    return ALLOWED_TYPES[file_content_type]


def upload_resume_to_s3(
    file_content: bytes,
    user_id: int,
    file_extension: str,
    content_type: str
) -> str:
    """
    Uploads resume file to S3.
    Returns the S3 key (path inside the bucket).

    Why return the key and not the full URL?
    Because the bucket name can change.
    We generate the URL from the key when needed.
    Key never changes.
    """

    # Generate unique filename using UUID
    # uuid4() generates a random unique identifier
    unique_filename = f"{uuid.uuid4()}.{file_extension}"

    # Build the S3 key (path inside bucket)
    # Pattern: resumes/{user_id}/{unique_filename}
    s3_key = f"resumes/{user_id}/{unique_filename}"

    try:
        # Upload to S3
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=file_content,         # actual file bytes
            ContentType=content_type,  # tells S3 what type of file this is
        )
        return s3_key

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file to S3: {str(e)}"
        )


def generate_presigned_url(s3_key: str, expiry_seconds: int = 900) -> str:
    """
    Generates a presigned URL for downloading a file from S3.

    expiry_seconds=900 means URL valid for 15 minutes.
    After that the URL stops working automatically.

    The user downloads directly from S3.
    Our API server is not involved in the download.
    This saves EC2 bandwidth and CPU.
    """
    try:
        url = s3_client.generate_presigned_url(
            "get_object",           # operation type
            Params={
                "Bucket": BUCKET_NAME,
                "Key": s3_key
            },
            ExpiresIn=expiry_seconds
        )
        return url

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate download URL: {str(e)}"
        )


def delete_resume_from_s3(s3_key: str) -> None:
    """
    Deletes a file from S3.
    Called when user deletes their resume.
    """
    try:
        s3_client.delete_object(
            Bucket=BUCKET_NAME,
            Key=s3_key
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete file from S3: {str(e)}"
        )
