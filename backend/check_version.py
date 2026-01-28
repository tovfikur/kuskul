
import sys
import os
from sqlalchemy import text

# Ensure we can import app
sys.path.append(os.getcwd())

from app.db.session import SessionLocal

def check_version():
    db = SessionLocal()
    try:
        result = db.execute(text("SELECT version_num FROM alembic_version"))
        version = result.scalar()
        print(f"Current Alembic Version: {version}")
    except Exception as e:
        print(f"Error checking version: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_version()
