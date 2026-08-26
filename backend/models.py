from sqlalchemy import Column, Integer, String, DateTime, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    # This tells SQLAlchemy: this class = the "users" table in PostgreSQL
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)  # NEVER store plain password
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # One user can have many resumes
    # This is not a column — it is a Python-level relationship
    # lets you do: user.resumes to get all resumes for this user
    resumes = relationship("Resume", back_populates="owner")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)       # original file name
    s3_key = Column(String, nullable=False)         # path in S3 bucket
    file_type = Column(String, nullable=False)      # "pdf" or "docx"
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Foreign key: every resume belongs to a user
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="resumes")
    reviews = relationship("Review", back_populates="resume")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    ats_score = Column(Float, nullable=False)          # 0-100
    overall_feedback = Column(Text, nullable=False)    # AI summary
    skill_gaps = Column(Text, nullable=False)          # JSON string
    improvements = Column(Text, nullable=False)        # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Foreign key: every review belongs to a resume
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)

    resume = relationship("Resume", back_populates="reviews")
