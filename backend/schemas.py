from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


# ── Auth Schemas ──────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    """What the frontend sends when a user registers"""
    email: EmailStr        # Pydantic validates email format automatically
    full_name: str
    password: str          # plain text — we hash it in the route handler

class UserLogin(BaseModel):
    """What the frontend sends when a user logs in"""
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """What we send BACK — notice: no password_hash"""
    id: int
    email: str
    full_name: str
    created_at: datetime

    class Config:
        from_attributes = True  # allows reading from SQLAlchemy model objects

class Token(BaseModel):
    """JWT token response after successful login"""
    access_token: str
    token_type: str = "bearer"


# ── Resume Schemas ────────────────────────────────────────────────────────────

class ResumeResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


# ── Review Schemas ────────────────────────────────────────────────────────────

class ReviewResponse(BaseModel):
    id: int
    ats_score: float
    overall_feedback: str
    skill_gaps: str
    improvements: str
    created_at: datetime

    class Config:
        from_attributes = True
