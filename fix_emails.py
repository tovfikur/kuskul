import sys
import os

# Add backend directory to path to import app modules
sys.path.append(os.path.join(os.getcwd(), "backend"))

from sqlalchemy import text
from app.db.session import SessionLocal

def fix_emails():
    db = SessionLocal()
    try:
        # Update emails ending with .local to .kuskul.com
        # Postgres string functions
        sql = text("""
            UPDATE users 
            SET email = REPLACE(email, '.local', '.kuskul.com') 
            WHERE email LIKE '%.local';
        """)
        result = db.execute(sql)
        db.commit()
        print(f"Fixed {result.rowcount} users with invalid emails.")
    except Exception as e:
        print(f"Error fixing emails: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_emails()
