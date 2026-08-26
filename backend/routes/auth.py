from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import auth

# APIRouter is like a mini FastAPI app
# We group related routes together
# Then register this router in main.py
router = APIRouter(
    prefix="/api/auth",    # all routes here start with /api/auth
    tags=["Authentication"] # groups them in Swagger UI
)


@router.post("/register", response_model=schemas.UserResponse)
def register(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user.

    REQUEST FLOW:
    1. FastAPI receives POST /api/auth/register
    2. Pydantic validates the body against UserRegister schema
       - Is email format valid?
       - Are all required fields present?
    3. This function runs
    4. Check if email already exists in DB
    5. Hash the password
    6. Save user to DB
    7. Return user data (without password)
    """

    # Step 1: Check if email already registered
    existing_user = db.query(models.User).filter(
        models.User.email == user_data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Step 2: Hash the password
    # NEVER store the plain text password
    hashed_pw = auth.hash_password(user_data.password)

    # Step 3: Create the user object
    new_user = models.User(
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=hashed_pw
    )

    # Step 4: Save to database
    db.add(new_user)       # stage the insert
    db.commit()            # execute the INSERT in PostgreSQL
    db.refresh(new_user)   # reload from DB to get the generated id, created_at

    # Step 5: Return user
    # FastAPI uses UserResponse schema — which has no password_hash
    return new_user


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Login with email and password. Returns JWT token.

    REQUEST FLOW:
    1. FastAPI receives POST /api/auth/login
    2. Pydantic validates the body
    3. Look up user by email in DB
    4. Verify password against stored hash
    5. Create JWT token with user_id
    6. Return token
    """

    # Step 1: Find user by email
    user = db.query(models.User).filter(
        models.User.email == credentials.email
    ).first()

    # Step 2: Check user exists AND password is correct
    # We check both in one condition intentionally —
    # never tell the attacker WHICH one was wrong
    # "Email not found" tells attacker the email does not exist
    if not user or not auth.verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Step 3: Create JWT token
    access_token = auth.create_access_token(
        data={
            "user_id": user.id,
            "email": user.email
        }
    )

    # Step 4: Return token
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    """
    Get currently logged in user's profile.

    This route is PROTECTED.
    Depends(auth.get_current_user) means:
    - FastAPI extracts Bearer token from header
    - Verifies it
    - Fetches user from DB
    - Passes user object here as current_user

    If no token or invalid token → 401 before this function even runs
    """
    return current_user
