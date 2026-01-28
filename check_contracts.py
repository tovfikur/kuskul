
import sys
import os
from sqlalchemy import select, func

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import SessionLocal
from app.models.staff import Staff
from app.models.staff_extended import StaffContract

def check_data():
    db = SessionLocal()
    try:
        staff_count = db.scalar(select(func.count(Staff.id)))
        active_staff_count = db.scalar(select(func.count(Staff.id)).where(Staff.status == 'active'))
        
        contract_count = db.scalar(select(func.count(StaffContract.id)))
        active_contract_count = db.scalar(select(func.count(StaffContract.id)).where(StaffContract.status == 'active'))
        
        print(f"Total Staff: {staff_count}")
        print(f"Active Staff: {active_staff_count}")
        print(f"Total Contracts: {contract_count}")
        print(f"Active Contracts: {active_contract_count}")
        
        if active_staff_count > 0 and active_contract_count == 0:
            print("\nWARNING: You have active staff but NO active contracts. Payroll generation will result in 0 payslips.")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_data()
