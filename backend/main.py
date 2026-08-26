from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes import auth as auth_router
from routes import resume as resume_router
from routes import review as review_router

# This imports the models so SQLAlchemy knows about them
# Without this import, the tables won't be created
import models

app = FastAPI(
    title="AI Resume Reviewer",
    description="Analyzes resumes using Google Gemini",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create all tables when the app starts
# If the table already exists, it does nothing (safe to run repeatedly)

# all routes in auth_router now available under /api/auth/*
app.include_router(auth_router.router)
app.include_router(resume_router.router)
app.include_router(review_router.router)
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ai-resume-reviewer-api"
    }

@app.get("/")
def root():
    return {"message": "AI Resume Reviewer API is running"}
