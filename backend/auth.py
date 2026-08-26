from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from database import get_db
import models
import os
import hashlib
import base64
from dotenv import load_dotenv

load_dotenv()
oauth2_scheme = HTTPBearer()
# ── Password Hashing ──────────────────────────────────────────────────────────

def _prepare_password(password: str) -> bytes:
    """
    SHA256 hash the password first to avoid bcrypt 72-byte limit.
    Returns bytes — bcrypt needs bytes not string.
    """
    digest = hashlib.sha256(password.encode()).digest()
    return base64.b64encode(digest)

def hash_password(password: str) -> str:
    """
    Takes plain text password → returns bcrypt hash string
    """
    prepared = _prepare_password(password)
    hashed = bcrypt.hashpw(prepared, bcrypt.gensalt())
    return hashed.decode()   # store as string in DB

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies plain password against stored hash.
    Returns True if correct, False if wrong.
    """
    prepared = _prepare_password(plain_password)
    return bcrypt.checkpw(prepared, hashed_password.encode())

# ── JWT Token ─────────────────────────────────────────────────────────────────

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

def create_access_token(data: dict) -> str:
    """
    Creates a signed JWT token.

    data = { "user_id": 5, "email": "john@gmail.com" }

    Steps:
    1. Copy the data
    2. Add expiry time to the payload
    3. Sign it with SECRET_KEY
    4. Return the token string
    """
    to_encode = data.copy()

    # Set expiry time
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    # Sign and encode the token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """
    Verifies a JWT token.

    Returns the payload if valid.
    Returns None if invalid or expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ── Current User Dependency ───────────────────────────────────────────────────

# This tells FastAPI: look for a Bearer token in the Authorization header
# Example header: Authorization: Bearer eyJ...

def get_current_user(
    credentials = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    # Extract token from credentials object
    token = credentials.credentials
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = verify_token(token)
    if payload is None:
        raise credentials_exception

    user_id: int = payload.get("user_id")
    if user_id is None:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user
