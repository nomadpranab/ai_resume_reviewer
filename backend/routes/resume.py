from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models
import schemas
import s3_service

router = APIRouter(
    prefix="/api/resume",
    tags=["Resume"]
)


@router.post("/upload", response_model=schemas.ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),  # UploadFile handles multipart/form-data
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Upload a resume file (PDF or DOCX).

    REQUEST FLOW:
    1. FastAPI receives multipart/form-data request
    2. Extracts the uploaded file
    3. Reads file content into memory
    4. Validates file type and size
    5. Uploads to S3
    6. Saves metadata to PostgreSQL
    7. Returns resume details
    """

    # Step 1: Read file content into memory
    file_content = await file.read()

    # Step 2: Get file size
    file_size = len(file_content)

    # Step 3: Validate file type and size
    # validate_file raises HTTPException if invalid
    file_extension = s3_service.validate_file(
        file.content_type,
        file_size
    )

    # Step 4: Upload to S3
    # Returns the S3 key: "resumes/5/uuid.pdf"
    s3_key = s3_service.upload_resume_to_s3(
        file_content=file_content,
        user_id=current_user.id,
        file_extension=file_extension,
        content_type=file.content_type
    )

    # Step 5: Save metadata to PostgreSQL
    resume = models.Resume(
        filename=file.filename,     # original filename
        s3_key=s3_key,             # path in S3
        file_type=file_extension,  # "pdf" or "docx"
        user_id=current_user.id    # who uploaded it
    )

    db.add(resume)
    db.commit()
    db.refresh(resume)

    return resume


@router.get("/list", response_model=list[schemas.ResumeResponse])
def list_resumes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get all resumes for the currently logged in user.

    Notice: filter by user_id = current_user.id
    Users can ONLY see their own resumes.
    This is authorization.
    """
    resumes = db.query(models.Resume).filter(
        models.Resume.user_id == current_user.id
    ).all()

    return resumes


@router.get("/{resume_id}/download")
def get_download_url(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Generate a presigned URL for downloading a resume.

    Security check:
    Verify this resume belongs to the current user.
    User A cannot download User B's resume.
    """

    # Find the resume
    resume = db.query(models.Resume).filter(
        models.Resume.id == resume_id
    ).first()

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Security check — does this resume belong to current user?
    if resume.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access this resume"
        )

    # Generate presigned URL
    download_url = s3_service.generate_presigned_url(resume.s3_key)

    return {
        "download_url": download_url,
        "expires_in": "15 minutes",
        "filename": resume.filename
    }


@router.delete("/{resume_id}")
def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Delete a resume — from both S3 and PostgreSQL.
    """

    # Find the resume
    resume = db.query(models.Resume).filter(
        models.Resume.id == resume_id
    ).first()

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Security check
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Delete from S3 first
    s3_service.delete_resume_from_s3(resume.s3_key)

    # Then delete from PostgreSQL
    db.delete(resume)
    db.commit()

    return {"message": "Resume deleted successfully"}
