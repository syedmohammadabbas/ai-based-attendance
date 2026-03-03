from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timedelta
from jose import jwt
from app.config.settings import get_settings
from app.models.admin import Admin
from app.schemas.schemas import AdminRegister, AdminLogin, TokenResponse, AdminResponse
from app.middleware.auth import get_current_admin
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.config.database import get_db

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def create_token(admin_id: int) -> str:
    settings = get_settings()
    expires = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRES_MINUTES)
    payload = {"sub": str(admin_id), "exp": expires}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: AdminRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Admin).filter(Admin.email == data.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Admin with this email already exists.")

    admin = Admin(
        name=data.name,
        email=data.email,
        password=Admin.hash_password(data.password),
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)

    token = create_token(admin.id)
    return TokenResponse(
        message="Admin registered successfully.",
        token=token,
        data=AdminResponse(id=admin.id, name=admin.name, email=admin.email, role=admin.role),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: AdminLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Admin).filter(Admin.email == data.email))
    admin = result.scalar_one_or_none()
    
    if not admin or not admin.verify_password(data.password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_token(admin.id)
    return TokenResponse(
        message="Login successful.",
        token=token,
        data=AdminResponse(id=admin.id, name=admin.name, email=admin.email, role=admin.role),
    )


@router.get("/me")
async def get_me(admin: Admin = Depends(get_current_admin)):
    return {
        "success": True,
        "data": {"id": admin.id, "name": admin.name, "email": admin.email, "role": admin.role},
    }
