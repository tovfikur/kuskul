
import sys
import os
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.session import SessionLocal
from app.models.school import School
from app.models.user import User
from app.models.staff import Staff
from app.models.staff_extended import StaffContract
from app.models.staff_leave import LeaveType, StaffLeaveRequest
from app.models.teacher_assignment import StaffAttendance
from app.models.payroll import PayrollCycle, Payslip
from app.api.v1.endpoints.payroll import process_payroll_cycle
from app.schemas.payroll import PayrollProcessRequest

def verify():
    db = SessionLocal()
    try:
        # 1. Get Context
        school = db.query(School).first()
        if not school:
            print("No school found. Creating dummy school...")
            school = School(name="Test School", code="TEST", address="Test Addr", contact_email="test@test.com", contact_phone="123")
            db.add(school)
            db.commit()
            
        user = db.query(User).first()
        if not user:
            print("No user found. Creating dummy user...")
            user = User(email="admin@test.com", hashed_password="x", full_name="Admin", school_id=school.id, role="admin")
            db.add(user)
            db.commit()

        # 2. Create Staff
        staff = Staff(
            school_id=school.id,
            full_name="John Doe",
            email=f"john.doe.{uuid.uuid4()}@example.com",
            phone="1234567890",
            employee_id=f"EMP-{uuid.uuid4().hex[:6]}"
        )
        db.add(staff)
        db.commit()
        
        # 3. Create Contract
        contract = StaffContract(
            staff_id=staff.id,
            contract_type="permanent",
            start_date=datetime(2024, 1, 1),
            salary=Decimal("30000.00"),
            working_hours_per_week=40
        )
        db.add(contract)
        
        # 4. Create Leave Type (Unpaid)
        unpaid_type = LeaveType(
            school_id=school.id,
            name="Unpaid Leave",
            code="UL",
            days_per_year=10,
            is_paid=False
        )
        db.add(unpaid_type)
        db.commit()
        
        # 5. Create Cycle (Nov 2024 - 30 days)
        cycle = PayrollCycle(
            school_id=school.id,
            month=11,
            year=2024,
            status="draft",
            notes="Test Cycle"
        )
        db.add(cycle)
        db.commit()
        
        # 6. Create Attendance (Absent on Nov 5, Nov 6)
        # Note: Logic counts 'absent' status
        att1 = StaffAttendance(
            staff_id=staff.id,
            attendance_date=datetime(2024, 11, 5),
            status="absent"
        )
        att2 = StaffAttendance(
            staff_id=staff.id,
            attendance_date=datetime(2024, 11, 6),
            status="absent"
        )
        # Add a present day just to be sure
        att3 = StaffAttendance(
            staff_id=staff.id,
            attendance_date=datetime(2024, 11, 7),
            status="present"
        )
        db.add_all([att1, att2, att3])
        
        # 7. Create Leave Request (Unpaid: Nov 10 to Nov 12 = 3 days)
        leave = StaffLeaveRequest(
            staff_id=staff.id,
            leave_type_id=unpaid_type.id,
            start_date=date(2024, 11, 10),
            end_date=date(2024, 11, 12),
            total_days=3,
            reason="Sick",
            status="approved"
        )
        db.add(leave)
        db.commit()
        
        # 8. Run Process
        print("Running Payroll Process...")
        payload = PayrollProcessRequest(auto_generate_payslips=True, include_inactive_staff=False)
        result = process_payroll_cycle(
            cycle_id=cycle.id,
            payload=payload,
            db=db,
            user=user,
            school_id=school.id
        )
        
        # 9. Verify
        payslip = db.query(Payslip).filter(Payslip.payroll_cycle_id == cycle.id, Payslip.staff_id == staff.id).first()
        
        print("-" * 50)
        print(f"Basic Salary: {payslip.basic_salary}")
        print(f"Allowances: {payslip.allowances}")
        print(f"Deductions: {payslip.deductions}")
        print(f"Net Salary: {payslip.net_salary}")
        print("-" * 50)
        
        # Expected Logic:
        # Basic: 30,000
        # Days in Nov: 30
        # Daily Rate: 1000
        # Absent Days: 2 (Nov 5, 6)
        # Unpaid Leave Days: 3 (Nov 10, 11, 12)
        # Total Deductible Days: 5
        # Expected Deduction: 5000
        # Plus Tax/PF
        
        deduction_str = payslip.deductions.get("Attendance/Leave Deduction", "0")
        attendance_deduction = Decimal(deduction_str)
        
        if attendance_deduction == Decimal("5000.00"):
            print("SUCCESS: Attendance/Leave Deduction is correct (5000.00)")
        else:
            print(f"FAILURE: Expected 5000.00, got {attendance_deduction}")

        # Cleanup
        # Delete all payslips for this cycle first
        db.query(Payslip).filter(Payslip.payroll_cycle_id == cycle.id).delete()
        
        # Delete dependent records
        db.query(StaffLeaveRequest).filter(StaffLeaveRequest.staff_id == staff.id).delete()
        db.query(StaffAttendance).filter(StaffAttendance.staff_id == staff.id).delete()
        db.query(StaffContract).filter(StaffContract.staff_id == staff.id).delete()
        
        db.delete(cycle)
        db.delete(staff)
        # db.delete(unpaid_type) # Might be used by others, keep it or check deps
        db.commit()
        print("Cleanup done.")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify()
