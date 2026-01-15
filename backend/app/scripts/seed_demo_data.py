"""
Seed demo academic data for persistent development DB.
Run: python backend/app/scripts/seed_demo_data.py
"""
import os
import sys
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models import academic_year, student, school_class, section, school, user, role, membership
from app.core.security import hash_password
from app.core.seed import ensure_default_roles
from datetime import datetime

# Check if demo data already exists

def has_demo_data(db: Session):
    return db.query(school.School).filter_by(code="KUSKUL_DEMO").first() is not None

def seed_demo_data():
    db = SessionLocal()
    try:
        # School
        demo_school = db.query(school.School).filter_by(code="KUSKUL_DEMO").first()
        if not demo_school:
            demo_school = school.School(
                name="KusKul Demo School", code="KUSKUL_DEMO", is_active=True, created_at=datetime.utcnow()
            )
            db.add(demo_school)
            db.commit()
            db.refresh(demo_school)
            print(f"Created demo school: {demo_school.id}")

        from app.models import subject_group
        # Subject Group (required for subject FK)
        sg = db.query(subject_group.SubjectGroup).filter_by(school_id=demo_school.id, name="Demo Group").first()
        if not sg:
            sg = subject_group.SubjectGroup(
                school_id=demo_school.id,
                name="Demo Group",
                class_id=None,
                stream_id=None,
                is_optional=False,
                created_at=datetime.utcnow(),
            )
            db.add(sg)
            db.commit()
            db.refresh(sg)
        print(f"Created subject group: {sg.id}")

        admin_email = "admin@kuskul.com"
        admin_password = "password123"
        admin_user = db.query(user.User).filter_by(email=admin_email).first()
        if not admin_user:
            admin_user = user.User(
                email=admin_email,
                password_hash=hash_password(admin_password),
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        # Ensure rich demo data for the demo school
        from app.models import stream, subject, staff, teacher_assignment
        years = [
            {"name": "2023", "start_date": "2023-01-01", "end_date": "2023-12-31", "is_current": False},
            {"name": "2024", "start_date": "2024-01-01", "end_date": "2024-12-31", "is_current": True},
        ]
        year_objs = []
        for y in years:
            obj = db.query(academic_year.AcademicYear).filter_by(school_id=demo_school.id, name=y["name"]).first()
            if not obj:
                obj = academic_year.AcademicYear(
                    school_id=demo_school.id,
                    name=y["name"],
                    start_date=y["start_date"],
                    end_date=y["end_date"],
                    is_current=y["is_current"],
                    created_at=datetime.utcnow(),
                )
                db.add(obj)
                db.commit()
                db.refresh(obj)
            year_objs.append(obj)
        print(f"Created academic years: {[y.id for y in year_objs]}")

        # Streams
        stream_names = ["Science", "Commerce"]
        stream_objs = []
        for sname in stream_names:
            sobj = db.query(stream.Stream).filter_by(school_id=demo_school.id, name=sname).first()
            if not sobj:
                sobj = stream.Stream(
                    school_id=demo_school.id,
                    name=sname,
                    is_active=True,
                    created_at=datetime.utcnow(),
                )
                db.add(sobj)
                db.commit()
                db.refresh(sobj)
            stream_objs.append(sobj)
        print(f"Created streams: {[s.id for s in stream_objs]}")

        # Classes and Sections
        class_objs = []
        section_objs = []
        for cidx, cname in enumerate(["Class 10", "Class 11", "Class 12"]):
            cobj = db.query(school_class.SchoolClass).filter_by(school_id=demo_school.id, name=cname).first()
            if not cobj:
                cobj = school_class.SchoolClass(
                    school_id=demo_school.id,
                    name=cname,
                    is_active=True,
                    created_at=datetime.utcnow(),
                )
                db.add(cobj)
                db.commit()
                db.refresh(cobj)
            class_objs.append(cobj)
            # 2 sections per class
            for sname, sstream in zip(["A", "B"], stream_objs):
                sobj = db.query(section.Section).filter_by(class_id=cobj.id, name=sname).first()
                if not sobj:
                    sobj = section.Section(
                        class_id=cobj.id,
                        name=sname,
                        is_active=True,
                        created_at=datetime.utcnow(),
                        stream_id=sstream.id,
                    )
                    db.add(sobj)
                    db.commit()
                    db.refresh(sobj)
                section_objs.append(sobj)
        print(f"Created classes: {[c.id for c in class_objs]}")
        print(f"Created sections: {[s.id for s in section_objs]}")

        # Subjects
        subject_names = ["Mathematics", "Physics", "Chemistry", "Economics"]
        subject_objs = []
        for sname, sstream in zip(subject_names, stream_objs * 2):
            sobj = db.query(subject.Subject).filter_by(school_id=demo_school.id, name=sname).first()
            if not sobj:
                sobj = subject.Subject(
                    school_id=demo_school.id,
                    name=sname,
                    code=sname[:4].upper(),
                    subject_type="theory",
                    is_active=True,
                    created_at=datetime.utcnow(),
                    stream_id=sstream.id,
                    group_id=sg.id,
                )
                db.add(sobj)
                db.commit()
                db.refresh(sobj)
            subject_objs.append(sobj)
        print(f"Created subjects: {[s.id for s in subject_objs]}")

        # Staff (teachers)
        teacher_names = ["Alice Smith", "Bob Johnson", "Carol Lee"]
        staff_objs = []
        for tname in teacher_names:
            tobj = db.query(staff.Staff).filter_by(school_id=demo_school.id, full_name=tname).first()
            if not tobj:
                tobj = staff.Staff(
                    school_id=demo_school.id,
                    full_name=tname,
                    designation="Teacher",
                    status="active",
                    created_at=datetime.utcnow(),
                )
                db.add(tobj)
                db.commit()
                db.refresh(tobj)
            staff_objs.append(tobj)
        print(f"Created staff: {[t.id for t in staff_objs]}")

        # Assign teachers to sections/subjects for current year
        for idx, sec in enumerate(section_objs):
            for subj in subject_objs:
                ta = db.query(teacher_assignment.TeacherAssignment).filter_by(
                    academic_year_id=year_objs[1].id, section_id=sec.id, subject_id=subj.id
                ).first()
                if not ta:
                    ta = teacher_assignment.TeacherAssignment(
                        academic_year_id=year_objs[1].id,
                        staff_id=staff_objs[idx % len(staff_objs)].id,
                        section_id=sec.id,
                        subject_id=subj.id,
                        is_active=True,
                        created_at=datetime.utcnow(),
                    )
                    db.add(ta)
        db.commit()
        print("Assigned teachers to sections/subjects.")

        # Students (10 total, distributed)
        for i in range(10):
            s = db.query(student.Student).filter_by(
                school_id=demo_school.id, first_name=f"Student{i+1}"
            ).first()
            if not s:
                s = student.Student(
                    school_id=demo_school.id,
                    first_name=f"Student{i+1}",
                    last_name=f"Demo{i+1}",
                    status="active",
                    created_at=datetime.utcnow(),
                )
                db.add(s)
        db.commit()
        print("Created demo students.")

        # Demo Role
        demo_role = db.query(role.Role).filter_by(name="Demo Admin").first()
        if not demo_role:
            demo_role = role.Role(name="Demo Admin", permissions={"*": True})
            db.add(demo_role)
            db.commit()
            db.refresh(demo_role)
            print(f"Created role: {demo_role.id}")
        # Demo User
        demo_email = "demo@school.com"
        demo_password = "demo1234"
        demo_user = db.query(user.User).filter_by(email=demo_email).first()
        if not demo_user:
            demo_user = user.User(
                email=demo_email,
                password_hash=hash_password(demo_password),
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
            print(f"Created user: {demo_user.id}")
        # Membership
        from sqlalchemy import and_
        demo_membership = db.query(membership.Membership).filter(
            and_(membership.Membership.user_id == demo_user.id, membership.Membership.school_id == demo_school.id)
        ).first()
        if not demo_membership:
            demo_membership = membership.Membership(
                user_id=demo_user.id,
                school_id=demo_school.id,
                role_id=demo_role.id,
                is_active=True,
                created_at=datetime.utcnow(),
            )
            db.add(demo_membership)
            db.commit()
            print(f"Created membership for user {demo_user.email} in school {demo_school.name}")

        print("Demo data seeded. Demo login: demo@school.com / demo1234")
        # --- Advanced Academic Modules Seeding ---
        from app.models import time_slot, timetable_entry, grade, curriculum_unit, academic_calendar_settings, event, holiday, term

        # Terms/Semesters
        term_objs = []
        for tname, start, end in [
            ("Term 1", "2024-01-01", "2024-05-31"),
            ("Term 2", "2024-06-01", "2024-12-31"),
        ]:
            t = db.query(term.Term).filter_by(academic_year_id=year_objs[-1].id, name=tname).first()
            if not t:
                t = term.Term(
                    academic_year_id=year_objs[-1].id,
                    name=tname,
                    start_date=start,
                    end_date=end,
                    created_at=datetime.utcnow(),
                )
                db.add(t)
                db.commit()
                db.refresh(t)
            term_objs.append(t)
        print("Created terms/semesters.")

        # Period Structure (Time Slots)
        period_times = [
            ("Period 1", "09:00", "09:45"),
            ("Period 2", "09:55", "10:40"),
            ("Period 3", "10:50", "11:35"),
            ("Period 4", "11:45", "12:30"),
            ("Period 5", "13:30", "14:15"),
            ("Period 6", "14:25", "15:10"),
        ]
        period_objs = []
        for name, start, end in period_times:
            p = db.query(time_slot.TimeSlot).filter_by(school_id=demo_school.id, name=name).first()
            if not p:
                p = time_slot.TimeSlot(
                    school_id=demo_school.id,
                    name=name,
                    start_time=start,
                    end_time=end,
                    created_at=datetime.utcnow(),
                )
                db.add(p)
                db.commit()
                db.refresh(p)
            period_objs.append(p)
        print("Created period structure (time slots).")

        # Timetable (entries for classes/sections/periods)
        for sec in section_objs:
            for idx, period in enumerate(period_objs):
                subj = subject_objs[idx % len(subject_objs)]
                entry = db.query(timetable_entry.TimetableEntry).filter_by(
                    section_id=sec.id, time_slot_id=period.id
                ).first()
                if not entry:
                    entry = timetable_entry.TimetableEntry(
                        academic_year_id=year_objs[-1].id,
                        section_id=sec.id,
                        time_slot_id=period.id,
                        subject_id=subj.id,
                        staff_id=staff_objs[idx % len(staff_objs)].id,
                        day_of_week=idx % 5,
                        created_at=datetime.utcnow(),
                    )
                    db.add(entry)
            db.commit()
        print("Created demo timetable entries.")

        # Grading (grade scales)
        grade_scales = [
            ("A+", 90, 100),
            ("A", 80, 89),
            ("B", 70, 79),
            ("C", 60, 69),
            ("D", 50, 59),
            ("F", 0, 49),
        ]
        for name, min_mark, max_mark in grade_scales:
            g = db.query(grade.Grade).filter_by(school_id=demo_school.id, name=name).first()
            if not g:
                g = grade.Grade(
                    school_id=demo_school.id,
                    name=name,
                    min_percentage=min_mark,
                    max_percentage=max_mark,
                    created_at=datetime.utcnow(),
                )
                db.add(g)
        db.commit()
        print("Created grading scale.")

        # Curriculum (units/topics for subjects)
        for subj in subject_objs:
            for i in range(1, 4):
                unit_name = f"Unit {i} for {subj.name}"
                cu = db.query(curriculum_unit.CurriculumUnit).filter_by(subject_id=subj.id, title=unit_name).first()
                if not cu:
                    cu = curriculum_unit.CurriculumUnit(
                        academic_year_id=year_objs[-1].id,
                        subject_id=subj.id,
                        title=unit_name,
                        description=f"Description for {unit_name}",
                        order_index=i,
                        created_at=datetime.utcnow(),
                    )
                    db.add(cu)
        db.commit()
        print("Created curriculum units for subjects.")

        # Academic Calendar (settings, events, holidays)
        acs = db.query(academic_calendar_settings.AcademicCalendarSettings).filter_by(academic_year_id=year_objs[-1].id).first()
        if not acs:
            acs = academic_calendar_settings.AcademicCalendarSettings(
                academic_year_id=year_objs[-1].id,
                holidays_enabled=True,
                events_enabled=True,
                created_at=datetime.utcnow(),
            )
            db.add(acs)
            db.commit()
            db.refresh(acs)
        # Add demo events
        for i in range(1, 3):
            ev = db.query(event.Event).filter_by(school_id=demo_school.id, title=f"Event {i}").first()
            if not ev:
                ev = event.Event(
                    school_id=demo_school.id,
                    title=f"Event {i}",
                    start_date=datetime(2024, 2, i+10).date(),
                    end_date=datetime(2024, 2, i+10).date(),
                    description=f"Demo event {i}",
                    created_at=datetime.utcnow(),
                )
                db.add(ev)
        # Add demo holidays
        for i in range(1, 3):
            hd = db.query(holiday.Holiday).filter_by(school_id=demo_school.id, name=f"Holiday {i}").first()
            if not hd:
                hd = holiday.Holiday(
                    school_id=demo_school.id,
                    name=f"Holiday {i}",
                    holiday_date=datetime(2024, 3, i+5),
                    description=f"Demo holiday {i}",
                    created_at=datetime.utcnow(),
                )
                db.add(hd)
        db.commit()
        print("Created academic calendar settings, events, and holidays.")
    except Exception as e:
        print(f"Error seeding demo data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()
