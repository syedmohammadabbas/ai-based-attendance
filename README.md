# AI-Based Attendance Management System

A full-stack attendance management system featuring **real-time face recognition**, **automated timetable scheduling**, **Excel reports**, and **email notifications** — built with FastAPI and React.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Models](#database-models)
- [Face Recognition](#face-recognition)
- [Timetable Scheduler](#timetable-scheduler)
- [Demo Data](#demo-data)
- [Screenshots](#screenshots)

---

## Features

| Feature | Description |
|---|---|
| **Admin Authentication** | JWT-based login with bcrypt password hashing, 7-day token expiry |
| **Student Management** | Add, search, filter and paginate 250+ students across 8 departments |
| **Subject Management** | Manage 30 subjects across 8 semesters with faculty assignment |
| **AI Face Recognition** | Register student faces via webcam or photo upload; auto-recognize and mark attendance with a confidence score |
| **Live Face Scanner** | Real-time webcam scanner with manual & auto-scan (every 2.5 s) modes |
| **Timetable** | Weekly class schedule (Mon–Sat) with room assignments per semester |
| **Auto Session Scheduler** | APScheduler fires every minute — automatically starts and stops attendance sessions at timetable times |
| **Attendance Marking** | Mark present/absent manually or via AI; stores `marked_by` and `confidence_score` |
| **Email Notifications** | Sends absence alert emails to parent addresses via Gmail SMTP |
| **Excel Export** | Download full attendance report for any subject as `.xlsx` |
| **Reports & Analytics** | Bar charts, pie charts, attendance %, per-student summaries |
| **Responsive UI** | Mobile-friendly sidebar, dark nav, animated cards |

---

## Tech Stack

### Backend
| Library | Version | Purpose |
|---|---|---|
| [FastAPI](https://fastapi.tiangolo.com/) | 0.115.0 | Async REST API framework |
| [SQLAlchemy](https://www.sqlalchemy.org/) | 2.0.35 | Async ORM |
| [psycopg](https://www.psycopg.org/) | 3.2.3 | PostgreSQL async driver |
| [Pydantic v2](https://docs.pydantic.dev/) | 2.9.0 | Request/response validation |
| [python-jose](https://github.com/mpdavis/python-jose) | 3.3.0 | JWT token handling |
| [passlib + bcrypt](https://passlib.readthedocs.io/) | 1.7.4 / 4.0.1 | Password hashing |
| [face_recognition](https://github.com/ageitgey/face_recognition) | latest | dlib ResNet-based face encoding |
| [APScheduler](https://apscheduler.readthedocs.io/) | 3.10.4 | Background cron scheduler |
| [aiosmtplib](https://aiosmtplib.readthedocs.io/) | 3.0.1 | Async SMTP email |
| [openpyxl](https://openpyxl.readthedocs.io/) | 3.1.5 | Excel file generation |
| [Uvicorn](https://www.uvicorn.org/) | 0.30.0 | ASGI server |

### Frontend
| Library | Version | Purpose |
|---|---|---|
| [React](https://react.dev/) | 18.3.1 | UI framework |
| [Vite](https://vitejs.dev/) | 5.4.2 | Build tool & dev server |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4.11 | Utility-first styling |
| [React Router v6](https://reactrouter.com/) | 6.26.0 | Client-side routing |
| [Zustand](https://zustand-demo.pmnd.rs/) | 5.0.0 | Global auth state |
| [Axios](https://axios-http.com/) | 1.7.7 | HTTP client with JWT interceptors |
| [Recharts](https://recharts.org/) | 2.12.7 | Charts and graphs |
| [Lucide React](https://lucide.dev/) | 0.441.0 | Icon set |
| [React Hook Form](https://react-hook-form.com/) | 7.53.0 | Form handling & validation |
| [React Hot Toast](https://react-hot-toast.com/) | 2.4.1 | Toast notifications |

---

## Project Structure

```
ai-based-attendance/
│
├── Backend/                          # FastAPI application
│   ├── app/
│   │   ├── config/
│   │   │   ├── database.py           # SQLAlchemy engine, session factory
│   │   │   └── settings.py           # Pydantic settings (reads .env)
│   │   ├── middleware/
│   │   │   └── auth.py               # JWT bearer dependency
│   │   ├── models/
│   │   │   ├── admin.py
│   │   │   ├── student.py
│   │   │   ├── subject.py
│   │   │   ├── timetable.py          # TimetableSlot model
│   │   │   ├── attendance_session.py
│   │   │   ├── attendance.py
│   │   │   └── face_encoding.py      # 128-d dlib encoding stored as JSON
│   │   ├── routes/
│   │   │   ├── auth.py               # POST /api/auth/register|login, GET /me
│   │   │   ├── students.py           # CRUD /api/students
│   │   │   ├── subjects.py           # CRUD /api/subjects
│   │   │   ├── attendance.py         # Sessions, marking, reports, export
│   │   │   ├── face.py               # Register, recognize, list, delete
│   │   │   └── timetable.py          # Full week + today schedule
│   │   ├── schemas/
│   │   │   └── schemas.py            # All Pydantic request/response models
│   │   └── services/
│   │       ├── face_service.py       # extract_encoding(), recognize_face()
│   │       ├── scheduler.py          # APScheduler auto start/stop sessions
│   │       ├── email_service.py      # Async absence notification emails
│   │       └── excel_service.py      # openpyxl attendance export
│   ├── main.py                       # FastAPI app, router registration, lifespan
│   ├── seed.py                       # Seeds 250 students + 30 subjects + attendance
│   ├── seed_timetable.py             # Seeds 90 timetable slots (30 subjects × 3 days)
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/                         # React + Vite application
    ├── src/
    │   ├── api/
    │   │   ├── client.js             # Axios instance + JWT interceptors
    │   │   ├── auth.js
    │   │   ├── students.js
    │   │   ├── subjects.js
    │   │   ├── attendance.js
    │   │   ├── face.js
    │   │   └── api.js                # Barrel re-export of all domain modules
    │   ├── components/
    │   │   ├── Layout.jsx            # App shell with sidebar + topbar
    │   │   ├── Sidebar.jsx           # Navigation with AI badge
    │   │   ├── Topbar.jsx
    │   │   ├── Modal.jsx             # Reusable modal (sm/md/lg/xl)
    │   │   ├── StatCard.jsx          # Dashboard metric card
    │   │   ├── EmptyState.jsx
    │   │   ├── PageLoader.jsx        # Full-page + skeleton loaders
    │   │   └── ProtectedRoute.jsx
    │   ├── hooks/
    │   │   └── useWebcam.js          # getUserMedia hook + captureFrame()
    │   ├── pages/
    │   │   ├── Login.jsx             # Register / Login toggle
    │   │   ├── Dashboard.jsx         # Stats, AreaChart, PieChart, recent table
    │   │   ├── Students.jsx          # Table with search, filter, add, register face
    │   │   ├── Subjects.jsx          # Semester cards with add modal
    │   │   ├── Attendance.jsx        # Start/stop sessions, mark attendance
    │   │   ├── FaceAttendance.jsx    # Live webcam AI scanner
    │   │   ├── Timetable.jsx         # Today schedule + full week grid
    │   │   └── Reports.jsx           # Filters, charts, Excel download
    │   ├── store/
    │   │   └── authStore.js          # Zustand: token + admin persisted to localStorage
    │   ├── utils/
    │   │   └── formatters.js         # formatDate, formatTime, formatConfidence, calcPercent
    │   ├── App.jsx                   # React Router routes + ProtectedRoute wrapper
    │   └── index.css                 # Tailwind base + custom component classes
    ├── vite.config.js                # Dev server proxy /api → localhost:8000
    ├── tailwind.config.js
    └── package.json
```

---

## Prerequisites

- **Python 3.11+** (3.13 recommended — tested)
- **PostgreSQL 13+**
- **Node.js 18+**
- **CMake** and **dlib** build tools (required for `face_recognition`)
  ```bash
  # macOS
  brew install cmake
  # Ubuntu
  sudo apt install cmake build-essential
  ```

---

## Getting Started

### Backend Setup

```bash
# 1. Navigate to the Backend directory
cd Backend

# 2. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE attendance_db;"

# 5. Copy and configure environment variables
cp .env.example .env
# Edit .env — set DATABASE_URL with your PostgreSQL password
# Note: if your password contains @, encode it as %40
# Example: postgresql+psycopg://postgres:Pass%40word@127.0.0.1:5432/attendance_db

# 6. Start the server (tables are created automatically on first run)
uvicorn main:app --reload --port 8000
```

The API will be available at **http://localhost:8000**
Interactive docs at **http://localhost:8000/docs**

### Frontend Setup

```bash
# From the project root
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at **http://localhost:5173**

---

## Environment Variables

Create a `.env` file inside `Backend/` based on `.env.example`:

```env
# Server
PORT=8000

# PostgreSQL (encode special characters: @ → %40, # → %23)
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@127.0.0.1:5432/attendance_db

# JWT
JWT_SECRET=your-long-random-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRES_MINUTES=10080        # 7 days

# Email notifications (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password   # Generate at myaccount.google.com/apppasswords
EMAIL_FROM=your_email@gmail.com
```

---

## Demo Data

Two seeders are included to populate the database for testing:

```bash
# From the Backend/ directory with venv active

# 1. Seed 250 students + 30 subjects + 60 sessions + 2,712 attendance records
python seed.py

# 2. Seed 90 timetable slots (30 subjects × 3 days/week)
python seed_timetable.py
```

**Demo credentials** (created by the API on first register):
- Register via `POST /api/auth/register` or through the UI login page

**Student data:**
- 250 students with Hindu names across 8 departments
- 4 weeks of historical attendance (65–98% attendance rate per student)
- 30% of records marked by AI with confidence scores

**Timetable pattern:**
| Semesters | Days | Time Slots |
|---|---|---|
| 1, 3, 5, 7 | Mon / Wed / Fri | 09:00–17:00 |
| 2, 4, 6, 8 | Tue / Thu / Sat | 09:00–17:00 |

---

## API Reference

All endpoints require `Authorization: Bearer <token>` except auth routes.

### Authentication — `/api/auth`
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new admin |
| `POST` | `/api/auth/login` | Login, returns JWT token |
| `GET` | `/api/auth/me` | Get current admin profile |

### Students — `/api/students`
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/students/` | List students (search, filter, paginate) |
| `POST` | `/api/students/add` | Add a new student |
| `GET` | `/api/students/{id}` | Get student by ID |

### Subjects — `/api/subjects`
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/subjects/` | List all subjects |
| `POST` | `/api/subjects/` | Add a new subject |

### Attendance — `/api/attendance`
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/attendance/start` | Start an attendance session |
| `POST` | `/api/attendance/stop` | Stop an active session |
| `POST` | `/api/attendance/mark` | Mark a student present/absent |
| `GET` | `/api/attendance/today` | Today's attendance records |
| `GET` | `/api/attendance/report` | Filtered report (date, subject, status) |
| `GET` | `/api/attendance/student/{id}` | Per-student summary |
| `GET` | `/api/attendance/export/{subject_id}` | Download `.xlsx` report |

### Face Recognition — `/api/face`
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/face/register/{student_id}` | Upload photo and store 128-d face encoding |
| `POST` | `/api/face/recognize` | Submit webcam frame, returns matched student + confidence |
| `GET` | `/api/face/registered` | List all students with registered faces |
| `DELETE` | `/api/face/register/{student_id}` | Remove a student's face data |
| `GET` | `/api/face/current-session` | Returns the active/timetabled subject for auto-select |

### Timetable — `/api/timetable`
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/timetable/` | Full weekly schedule grouped by day |
| `GET` | `/api/timetable/today` | Today's slots with live status (upcoming / ongoing / completed) |

### Health
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health check |

---

## Database Models

```
admins
  id, name, email, password_hash, role, created_at

students
  id, name, roll_no, department, email, password_hash,
  parent_email, is_active, created_at

subjects
  id, subject_name, faculty_name, semester, is_active, created_at

timetable_slots
  id, subject_id → subjects, day_of_week (0=Mon…5=Sat),
  start_time, end_time, room, is_active

attendance_sessions
  id, subject_id → subjects, started_by → admins,
  start_time, end_time, active, date

attendance
  id, student_id → students, subject_id → subjects,
  session_id → attendance_sessions, date, time,
  status (present|absent), confidence_score, marked_by (manual|ai)

face_encodings
  id, student_id → students (unique), encoding (JSON 128-d float array),
  image_path, created_at, updated_at
```

---

## Face Recognition

The system uses **dlib's ResNet-based face recognition** model (via the `face_recognition` library) which produces a **128-dimensional face encoding** for each registered face.

### How it works

```
Register                              Recognize
────────                              ─────────
Upload photo                          Webcam frame
     │                                     │
     ▼                                     ▼
HOG face detection               HOG face detection
     │                                     │
     ▼                                     ▼
128-d ResNet encoding            128-d ResNet encoding
     │                                     │
     ▼                                     ▼
Stored in DB as JSON             Compare against all DB encodings
                                  using Euclidean distance
                                       │
                                       ▼
                                 Best match (tolerance 0.5)
                                       │
                                       ▼
                                 Confidence = (1 - distance) × 100%
```

### Confidence thresholds

| Score | Colour | Meaning |
|---|---|---|
| ≥ 85% | Green | High confidence match |
| 70–84% | Amber | Moderate confidence |
| < 70% | Red | Low confidence |

### In-memory cache
All face encodings are cached in memory at startup for fast recognition. The cache is invalidated automatically on every register or delete operation.

---

## Timetable Scheduler

The `APScheduler` runs an async job **every minute** that:

1. Reads today's timetable slots from the database
2. If `current_time == slot.start_time` → creates an `AttendanceSession` automatically
3. If `current_time == slot.end_time` → marks the session as `active=False` with `end_time`

```python
# app/services/scheduler.py
scheduler.add_job(
    _auto_sessions,
    trigger="cron",
    minute="*",    # fires every minute at :00
)
```

Sessions started by the scheduler have `started_by=None` (system-generated).
Manual override is available from the **Timetable** and **Attendance** pages.

---

## Running in Production

```bash
# Backend
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2

# Frontend — build static files
cd frontend && npm run build
# Serve dist/ with nginx or any static host
```

> **Note:** For production, replace `Base.metadata.create_all` in `database.py` with [Alembic](https://alembic.sqlalchemy.org/) migrations.

---

## License

This project is open source and available under the [MIT License](LICENSE).
