# AI-Based Attendance Management System

A complete **FastAPI + PostgreSQL** backend for an AI-Based Attendance Management System with JWT authentication, Excel export, and automated parent email notifications.

---

## 📁 Folder Structure

```
AI-BASED-ATTENDANCE/
├── main.py                     # Entry point
├── requirements.txt
├── .env / .env.example
├── .gitignore
└── app/
    ├── config/
    │   ├── settings.py         # Pydantic Settings (.env)
    │   └── database.py         # SQLAlchemy Async Engine & Session
    ├── models/                 # SQLAlchemy ORM Models
    │   ├── admin.py
    │   ├── student.py
    │   ├── subject.py
    │   ├── attendance_session.py
    │   └── attendance.py
    ├── schemas/
    │   └── schemas.py          # Pydantic request/response validation schemas
    ├── middleware/
    │   └── auth.py             # JWT & DB dependency
    ├── routes/
    │   ├── auth.py
    │   ├── students.py
    │   ├── subjects.py
    │   └── attendance.py
    └── services/
        ├── email_service.py    # Parent absence alerts
        └── excel_service.py    # Attendance export
```

---

## ⚙️ Setup

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd AI-BASED-ATTENDANCE
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 8000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `JWT_ALGORITHM` | HS256 |
| `JWT_EXPIRES_MINUTES` | Token expiry (default: 10080 = 7 days) |
| `SMTP_HOST` | SMTP server |
| `SMTP_PORT` | 587 for TLS |
| `SMTP_USER` / `SMTP_PASS` | Email credentials |
| `EMAIL_FROM` | Sender email |

### 3. Start PostgreSQL

Ensure PostgreSQL is running locally and the database `attendance_db` is created.
Alternatively, use a managed cloud Postgres database (like Supabase, RDS, etc) and set `DATABASE_URL`.

### 4. Run the Server

```bash
python main.py
```

Server starts at **http://localhost:8000**
The database tables are automatically created on startup.

📖 **Swagger Docs**: http://localhost:8000/docs
📖 **ReDoc**: http://localhost:8000/redoc

---

## 🔌 API Reference

### 🔐 Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register admin |
| POST | `/api/auth/login` | Public | Login → JWT |
| GET | `/api/auth/me` | 🔒 | Current admin |

### 👨‍🎓 Students

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/students/add` | 🔒 | Add student |
| GET | `/api/students` | 🔒 | List (paginated, searchable) |
| GET | `/api/students/{id}` | 🔒 | Get by ID |

### 📚 Subjects

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/subjects` | 🔒 | Add subject |
| GET | `/api/subjects` | 🔒 | List subjects |

### 🕐 Sessions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/attendance/start` | 🔒 | Start session |
| POST | `/api/attendance/stop` | 🔒 | Stop session |

### ✅ Mark Attendance (AI Integration Point)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| **POST** | **`/api/attendance/mark`** | **Public** | Mark attendance |

```json
{
  "student_id": 1,
  "subject_id": 2,
  "status": "present",
  "confidence_score": 0.97,
  "marked_by": "ai"
}
```

### 📊 Reports

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/attendance/today` | 🔒 | Today's records |
| GET | `/api/attendance/student/{id}` | 🔒 | Student history |
| GET | `/api/attendance/report` | 🔒 | Filterable report |
| GET | `/api/attendance/export/{subject_id}` | 🔒 | Excel download |

---

## 🤖 AI Integration (Future)

```python
import requests

requests.post("http://localhost:8000/api/attendance/mark", json={
    "student_id": 1,
    "subject_id": 2,
    "status": "present",
    "confidence_score": 0.97,
    "marked_by": "ai"
})
```

---

## 📦 Tech Stack

| Package | Purpose |
|---|---|
| FastAPI | Web framework |
| SQLAlchemy | SQL toolkit and ORM |
| asyncpg / psycopg | Async PostgreSQL driver |
| passlib[bcrypt] | Password hashing |
| python-jose | JWT auth |
| aiosmtplib | Async email |
| openpyxl | Excel generation |
| pydantic-settings | Env config |
