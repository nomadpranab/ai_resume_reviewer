from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models
import schemas
import s3_service
import ai_service
import json

router = APIRouter(
    prefix="/api/review",
    tags=["Review"]
)


@router.post("/{resume_id}/analyze")
def analyze_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Analyze a resume using Google Gemini.

    REQUEST FLOW:
    1. Verify resume exists and belongs to current user
    2. Download resume bytes from S3
    3. Extract text from PDF/DOCX
    4. Send text to Gemini
    5. Parse Gemini response
    6. Save review to PostgreSQL
    7. Return structured feedback
    """

    # Step 1: Find resume and verify ownership
    resume = db.query(models.Resume).filter(
        models.Resume.id == resume_id
    ).first()

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Step 2: Download resume from S3
    # We use boto3 directly here to get the file bytes
    import boto3
    import os

    s3 = boto3.client(
        "s3",
        region_name=os.getenv("AWS_REGION"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
    )

    try:
        response = s3.get_object(
            Bucket=os.getenv("S3_BUCKET_NAME"),
            Key=resume.s3_key
        )
        file_bytes = response["Body"].read()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download resume from S3: {str(e)}"
        )

    # Step 3: Extract text from file
    resume_text = ai_service.extract_resume_text(
        file_bytes,
        resume.file_type
    )

    # Step 4 & 5: Send to Gemini and get structured response
    ai_result = ai_service.analyze_resume_with_gemini(resume_text)

    # Step 6: Save review to PostgreSQL
    # skill_gaps and improvements are lists/dicts
    # Store as JSON strings in PostgreSQL Text column
    review = models.Review(
        resume_id=resume.id,
        ats_score=ai_result["ats_score"],
        overall_feedback=ai_result["overall_feedback"],
        skill_gaps=json.dumps(ai_result["skill_gaps"]),
        improvements=json.dumps(ai_result["improvements"]),
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    # Step 7: Return full result to frontend
    return {
        "review_id": review.id,
        "resume_id": resume_id,
        "ats_score": ai_result["ats_score"],
        "overall_feedback": ai_result["overall_feedback"],
        "skill_gaps": ai_result["skill_gaps"],
        "improvements": ai_result["improvements"],
        "keywords_missing": ai_result.get("keywords_missing", []),
        "strengths": ai_result.get("strengths", []),
        "created_at": review.created_at
    }


@router.get("/{resume_id}/history")
def get_review_history(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get all reviews for a specific resume.
    Shows how the resume improved over time.
    """

    # Verify resume belongs to current user
    resume = db.query(models.Resume).filter(
        models.Resume.id == resume_id
    ).first()

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get all reviews for this resume
    reviews = db.query(models.Review).filter(
        models.Review.resume_id == resume_id
    ).order_by(models.Review.created_at.desc()).all()

    # Parse JSON strings back to lists
    result = []
    for review in reviews:
        result.append({
            "review_id": review.id,
            "ats_score": review.ats_score,
            "overall_feedback": review.overall_feedback,
            "skill_gaps": json.loads(review.skill_gaps),
            "improvements": json.loads(review.improvements),
            "created_at": review.created_at
        })

    return result
