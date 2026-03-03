"""
Demo data seeder — inserts 250 students + 30 subjects + attendance records.
Run: python seed.py
"""

import asyncio
import random
from datetime import date, datetime, timedelta
from app.config.database import engine, Base
from app.models.admin import Admin          # noqa: F401 — needed to resolve relationships
from app.models.student import Student
from app.models.subject import Subject
from app.models.attendance_session import AttendanceSession
from app.models.attendance import Attendance
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

random.seed(42)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ─── Students data ────────────────────────────────────────────────────────────

FIRST_NAMES = [
    # Male
    "Aarav","Arjun","Vivek","Rahul","Rohan","Vikram","Karan","Nikhil",
    "Ankit","Siddharth","Dhruv","Aman","Dev","Aditya","Pranav","Harsh",
    "Gaurav","Varun","Abhinav","Ritesh","Deepak","Rajesh","Suresh","Mahesh",
    "Shivam","Manish","Akash","Ravi","Suraj","Abhishek","Tushar","Himanshu",
    "Yash","Kunal","Nitin","Sumit","Vishal","Sachin","Ajay","Sanjay",
    "Prateek","Neeraj","Amitabh","Raghav","Kartik","Ishaan","Arnav","Tejas",
    "Mohit","Parth","Lakshay","Tanmay","Vipul","Girish","Piyush","Jayesh",
    # Female
    "Priya","Kavya","Ananya","Shreya","Divya","Pooja","Nisha","Deepa",
    "Meera","Sunita","Rekha","Geeta","Aarti","Shweta","Neha","Sonal",
    "Pallavi","Ritu","Smita","Ankita","Ishita","Bhavna","Kajal","Tanu",
    "Riya","Sneha","Monika","Payal","Swati","Simran","Komal","Shikha",
    "Nikita","Puja","Yamini","Surbhi","Rashmi","Dipti","Varsha","Usha",
    "Lalita","Savita","Manjula","Geetika","Sudha","Radha","Sita","Lata",
]

LAST_NAMES = [
    "Sharma","Verma","Singh","Kumar","Gupta","Patel","Joshi","Mehta",
    "Yadav","Mishra","Tiwari","Pandey","Dubey","Shukla","Agarwal","Chauhan",
    "Rajput","Thakur","Nair","Pillai","Menon","Iyer","Chaturvedi","Srivastava",
    "Banerjee","Chatterjee","Mukherjee","Das","Bose","Sen","Ghosh","Dey",
    "Reddy","Naidu","Rao","Krishnan","Venkatesh","Subramanian","Rajan","Nair",
    "Malhotra","Kapoor","Chopra","Arora","Bhatia","Khanna","Sethi","Ahuja",
    "Trivedi","Saxena","Dixit","Rastogi","Bajpai","Dwivedi","Upadhyay","Bhatt",
]

DEPARTMENTS = [
    "Computer Science", "Electronics", "Mechanical", "Civil",
    "Chemical", "Biotechnology", "Physics", "Mathematics",
]

DEPT_CODE = {
    "Computer Science": "CS",
    "Electronics":      "ECE",
    "Mechanical":       "ME",
    "Civil":            "CE",
    "Chemical":         "CHE",
    "Biotechnology":    "BT",
    "Physics":          "PHY",
    "Mathematics":      "MTH",
}

def make_students(n=250):
    rng = random.Random(42)
    used_names = set()
    students = []
    dept_counters = {d: 1 for d in DEPARTMENTS}

    while len(students) < n:
        first = rng.choice(FIRST_NAMES)
        last  = rng.choice(LAST_NAMES)
        name  = f"{first} {last}"
        if name in used_names:
            continue
        used_names.add(name)

        dept      = rng.choice(DEPARTMENTS)
        dept_code = DEPT_CODE[dept]
        roll      = f"{dept_code}{dept_counters[dept]:03d}"
        dept_counters[dept] += 1

        slug         = name.lower().replace(" ", ".") + str(len(students))
        email        = f"{slug}@university.edu"
        parent_email = f"parent.{slug}@gmail.com"

        students.append({
            "name": name,
            "roll_no": roll,
            "department": dept,
            "email": email,
            "password": Student.hash_password("student123"),
            "parent_email": parent_email,
            "is_active": True,
        })
    return students


# ─── Subjects data ────────────────────────────────────────────────────────────

SUBJECTS_RAW = [
    # Semester 1
    ("Introduction to Programming",         "Dr. Rajiv Sharma",       "Semester 1"),
    ("Calculus I",                           "Dr. Priya Verma",        "Semester 1"),
    ("English Communication Skills",         "Prof. Sunita Joshi",     "Semester 1"),
    ("Physics Fundamentals",                 "Dr. Arvind Mishra",      "Semester 1"),
    # Semester 2
    ("Object Oriented Programming",          "Dr. Sanjay Gupta",       "Semester 2"),
    ("Calculus II",                          "Dr. Priya Verma",        "Semester 2"),
    ("Digital Logic Design",                 "Dr. Vivek Tiwari",       "Semester 2"),
    ("Linear Algebra",                       "Dr. Meera Pandey",       "Semester 2"),
    # Semester 3
    ("Data Structures and Algorithms",       "Dr. Rohit Agarwal",      "Semester 3"),
    ("Database Management Systems",          "Dr. Kavita Singh",       "Semester 3"),
    ("Computer Organization & Architecture", "Dr. Suresh Yadav",       "Semester 3"),
    ("Probability & Statistics",             "Dr. Anita Chauhan",      "Semester 3"),
    # Semester 4
    ("Operating Systems",                    "Dr. Deepak Rajput",      "Semester 4"),
    ("Computer Networks",                    "Dr. Rekha Thakur",       "Semester 4"),
    ("Software Engineering",                 "Dr. Arjun Dubey",        "Semester 4"),
    ("Discrete Mathematics",                 "Dr. Geeta Saxena",       "Semester 4"),
    # Semester 5
    ("Artificial Intelligence",              "Dr. Nikhil Chaturvedi",  "Semester 5"),
    ("Web Technologies",                     "Prof. Ankita Mehta",     "Semester 5"),
    ("Theory of Computation",                "Dr. Vikram Srivastava",  "Semester 5"),
    ("Human Computer Interaction",           "Dr. Pallavi Iyer",       "Semester 5"),
    # Semester 6
    ("Machine Learning",                     "Dr. Aditya Banerjee",    "Semester 6"),
    ("Information Security",                 "Dr. Ravi Malhotra",      "Semester 6"),
    ("Mobile Application Development",       "Prof. Shreya Kapoor",    "Semester 6"),
    ("Cloud Computing",                      "Dr. Manish Chopra",      "Semester 6"),
    # Semester 7
    ("Deep Learning",                        "Dr. Aditya Banerjee",    "Semester 7"),
    ("Distributed Systems",                  "Dr. Gaurav Reddy",       "Semester 7"),
    ("Natural Language Processing",          "Dr. Sneha Krishnan",     "Semester 7"),
    ("Computer Vision",                      "Dr. Karan Nair",         "Semester 7"),
    # Semester 8
    ("Final Year Project I",                 "Dr. Rajiv Sharma",       "Semester 8"),
    ("Final Year Project II",                "Dr. Rohit Agarwal",      "Semester 8"),
]


# ─── Attendance helpers ───────────────────────────────────────────────────────

# Class time slots (start_h, end_h)
TIME_SLOTS = [
    (8, 9), (9, 10), (10, 11), (11, 12),
    (13, 14), (14, 15), (15, 16), (16, 17),
]

def past_weekdays(n_days: int) -> list[date]:
    """Return the last n_days Mon–Fri dates, most recent last."""
    days = []
    d = date.today() - timedelta(days=1)          # start from yesterday
    while len(days) < n_days:
        if d.weekday() < 5:                        # Mon=0 … Fri=4
            days.append(d)
        d -= timedelta(days=1)
    return list(reversed(days))


def rand_time(h_start: int) -> str:
    """Random HH:MM:SS within a class hour."""
    m = random.randint(0, 55)
    s = random.randint(0, 59)
    return f"{h_start:02d}:{m:02d}:{s:02d}"


def build_attendance_records(student_ids: list[int],
                              subject_ids: list[int],
                              admin_id: int | None) -> tuple[list, list]:
    """
    Simulate 4 weeks of attendance:
    - 20 past weekdays
    - 3 subjects run per day (random selection, no subject repeats same day)
    - Each session: 40–50 random students
    - Per-student attendance rate: 65–98% (assigned once, consistent)
    - 70% manual, 30% AI marking
    """
    class_days = past_weekdays(20)           # 4 weeks × 5 days

    # Assign each student a personal attendance probability (65–98%)
    student_rate = {sid: random.uniform(0.65, 0.98) for sid in student_ids}

    sessions_out  = []
    attendance_out = []

    # Track which (subject_id, date) pairs have been used to avoid duplicate sessions
    used_pairs: set[tuple[int, str]] = set()

    for day in class_days:
        date_str = day.strftime("%Y-%m-%d")

        # Pick 3 subjects for this day (no repeats per day)
        day_subjects = random.sample(subject_ids, min(3, len(subject_ids)))
        slots_today  = random.sample(TIME_SLOTS, len(day_subjects))

        for subject_id, (h_start, h_end) in zip(day_subjects, slots_today):
            pair = (subject_id, date_str)
            if pair in used_pairs:
                continue
            used_pairs.add(pair)

            # Pick 40–50 students for this class
            class_size   = random.randint(40, 50)
            class_students = random.sample(student_ids, min(class_size, len(student_ids)))

            # Build session (closed — past class)
            start_dt = datetime(day.year, day.month, day.day, h_start, random.randint(0, 5))
            end_dt   = datetime(day.year, day.month, day.day, h_end,   random.randint(50, 59))

            session = AttendanceSession(
                subject_id  = subject_id,
                started_by  = admin_id,
                start_time  = start_dt,
                end_time    = end_dt,
                active      = False,
                date        = date_str,
            )
            sessions_out.append((session, class_students, date_str, h_start))

    # Separate sessions to get IDs after flush — pack them together
    return sessions_out, student_rate


# ─── Main seeder ──────────────────────────────────────────────────────────────

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:

        # ── Subjects ──────────────────────────────────────────────────────────
        existing_subjects = (await db.execute(text("SELECT COUNT(*) FROM subjects"))).scalar()
        if existing_subjects > 0:
            print(f"⚠️  Subjects already seeded ({existing_subjects} found), skipping.")
        else:
            subjects = [Subject(subject_name=s, faculty_name=f, semester=sem)
                        for s, f, sem in SUBJECTS_RAW]
            db.add_all(subjects)
            await db.flush()
            print(f"✅  Inserted {len(subjects)} subjects.")

        # ── Students ──────────────────────────────────────────────────────────
        existing_students = (await db.execute(text("SELECT COUNT(*) FROM students"))).scalar()
        if existing_students > 0:
            print(f"⚠️  Students already seeded ({existing_students} found), skipping.")
        else:
            print("⏳  Generating 250 students (bcrypt hashing ~30 s)...")
            student_rows = make_students(250)
            db.add_all([Student(**d) for d in student_rows])
            await db.flush()
            print(f"✅  Inserted 250 students.")

        await db.commit()

        # ── Attendance records ─────────────────────────────────────────────────
        existing_att = (await db.execute(text("SELECT COUNT(*) FROM attendance"))).scalar()
        if existing_att > 0:
            print(f"⚠️  Attendance already seeded ({existing_att} records found), skipping.")
            print("🎉  Seeding complete!")
            return

        # Fetch IDs from DB
        student_ids = [r[0] for r in (await db.execute(text("SELECT id FROM students"))).fetchall()]
        subject_ids = [r[0] for r in (await db.execute(text("SELECT id FROM subjects"))).fetchall()]
        admin_row   = (await db.execute(text("SELECT id FROM admins LIMIT 1"))).fetchone()
        admin_id    = admin_row[0] if admin_row else None

        print(f"⏳  Building attendance sessions for 20 past class days...")
        session_plans, student_rate = build_attendance_records(student_ids, subject_ids, admin_id)

        total_records = 0
        for session_obj, class_students, date_str, h_start in session_plans:
            db.add(session_obj)
            await db.flush()          # get session_obj.id

            records = []
            for sid in class_students:
                is_present  = random.random() < student_rate[sid]
                status      = "present" if is_present else "absent"
                marked_by   = "ai" if random.random() < 0.30 else "manual"
                conf_score  = round(random.uniform(0.82, 0.99), 2) if marked_by == "ai" else None
                rec_time    = rand_time(h_start)

                records.append(Attendance(
                    student_id       = sid,
                    subject_id       = session_obj.subject_id,
                    session_id       = session_obj.id,
                    date             = date_str,
                    time             = rec_time,
                    status           = status,
                    confidence_score = conf_score,
                    marked_by        = marked_by,
                ))

            db.add_all(records)
            total_records += len(records)

        await db.commit()
        print(f"✅  Inserted {len(session_plans)} sessions + {total_records} attendance records.")
        print("🎉  Seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed())
