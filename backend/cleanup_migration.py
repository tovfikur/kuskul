
import sqlite3
import os

# Database path (assuming it's in the backend directory or I can find it from env)
# Usually it's in p:\KusKul\backend\app.db or similar.
# Let's try to find it. But I can use SQLAlchemy to connect.

from sqlalchemy import create_engine, text

# Assuming the default URL for SQLite
DATABASE_URL = "sqlite:///./dev.db"

def cleanup():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        tables_to_drop = [
            "departments",
            "designations",
            "staff_contracts",
            "leave_types",
            "leave_balances",
            "staff_leave_requests",
            "payroll_cycles",
            "payslips"
        ]
        
        # Disable foreign key constraints to allow dropping tables in any order
        conn.execute(text("PRAGMA foreign_keys = OFF"))
        
        for table in tables_to_drop:
            try:
                # Check if table exists first (optional, but good for logging)
                result = conn.execute(text(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'"))
                if result.fetchone():
                    print(f"Dropping table {table}...")
                    conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
                    print(f"Dropped {table}")
                else:
                    print(f"Table {table} does not exist.")
            except Exception as e:
                print(f"Error dropping {table}: {e}")
                
        conn.execute(text("PRAGMA foreign_keys = ON"))
        conn.commit()

if __name__ == "__main__":
    cleanup()
