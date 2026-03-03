from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.database import connect_db, close_db
from app.config.settings import get_settings
from app.routes.auth import router as auth_router
from app.routes.students import router as students_router
from app.routes.subjects import router as subjects_router
from app.routes.attendance import router as attendance_router
from app.routes.face import router as face_router
from app.routes.timetable import router as timetable_router
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()
    await close_db()


app = FastAPI(
    title="AI-Based Attendance Management System",
    description="Backend API for attendance management with AI/face recognition integration (using PostgreSQL + SQLAlchemy)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all Routers
app.include_router(auth_router)
app.include_router(students_router)
app.include_router(subjects_router)
app.include_router(attendance_router)
app.include_router(face_router)
app.include_router(timetable_router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "success": True,
        "message": "AI Attendance System API (PostgreSQL) is running.",
    }


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
