from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

# Load variables from .env file into environment
load_dotenv()

# Read the database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

# Engine = the actual connection to PostgreSQL
# Think of it as the phone line to your database
engine = create_engine(DATABASE_URL)

# SessionLocal = a factory that creates database sessions
# Each request gets its own session (its own conversation with the DB)
SessionLocal = sessionmaker(
    autocommit=False,  # we manually control when to commit
    autoflush=False,   # we manually control when to flush
    bind=engine
)

# Base = the foundation all our models will inherit from
# When you define a model class, it inherits from Base
# so SQLAlchemy knows it represents a database table
Base = declarative_base()


# This is a dependency function
# FastAPI calls this for every request that needs DB access
# It creates a session, yields it to the route handler,
# then closes it when the request is done
# Even if an error occurs — the finally block closes it
def get_db():
    db = SessionLocal()
    try:
        yield db      # give the session to the route handler
    finally:
        db.close()    # always close, no matter what
