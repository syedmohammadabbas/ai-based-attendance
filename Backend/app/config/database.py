from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config.settings import get_settings

settings = get_settings()

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()


async def connect_db():
    # Import all models so SQLAlchemy registers them before create_all
    import app.models.admin          # noqa
    import app.models.student        # noqa
    import app.models.subject        # noqa
    import app.models.attendance_session  # noqa
    import app.models.attendance     # noqa
    import app.models.face_encoding  # noqa
    import app.models.timetable      # noqa
    async with engine.begin() as conn:
        # Create all tables (in production, use Alembic migrations instead)
        await conn.run_sync(Base.metadata.create_all)
    print(f"✅ PostgreSQL Connected")


async def close_db():
    await engine.dispose()
    print("❌ PostgreSQL Disconnected")


# Dependency for routes
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
