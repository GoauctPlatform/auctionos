from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from app.core.config import settings
from app.core.config import settings
from app.api.api_v1.api import api_router
# Import base to register all models (including new property_scores)
from app.db import base  # noqa
from app.db.base_class import Base
from app.db.session import engine

from fastapi.staticfiles import StaticFiles
import os

from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis
from contextlib import asynccontextmanager

import asyncio
from app.services.status_updater import transition_past_auctions

async def run_daily_task():
    while True:
        try:
            await asyncio.to_thread(transition_past_auctions)
        except Exception as e:
            print(f"Error in daily background task: {e}")
        await asyncio.sleep(3600)  # Run every 1 hour


def run_safe_migrations():
    """
    Safely adds new columns to existing tables without Alembic.
    Uses IF NOT EXISTS syntax supported by both PostgreSQL and SQLite.
    Called once on startup — idempotent (safe to run multiple times).
    """
    from sqlalchemy import text, inspect
    db_url = str(engine.url)
    is_postgres = db_url.startswith("postgresql")

    migrations = [
        # (table, column, column_definition_postgres, column_definition_sqlite)
        ("users", "active_company_id",
         "INTEGER REFERENCES companies(id) ON DELETE SET NULL",
         "INTEGER"),
        ("client_lists", "company_id",
         "INTEGER REFERENCES companies(id) ON DELETE SET NULL",
         "INTEGER"),
        ("client_lists", "notes", "TEXT", "TEXT"),
        ("auction_events", "status", "VARCHAR(50) DEFAULT 'active'", "VARCHAR(50) DEFAULT 'active'"),
        
        # Privacy / Custom Property tracking for PropertyDetails
        ("property_details", "company_id", "INTEGER REFERENCES companies(id) ON DELETE SET NULL", "INTEGER"),
        ("property_details", "created_by_user_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL", "INTEGER"),
        
        # User Properties Expansion (Fix for 'bedrooms' missing error)
        ("user_properties", "parcel_id", "VARCHAR(100)", "VARCHAR(100)"),
        ("user_properties", "county", "VARCHAR(100)", "VARCHAR(100)"),
        ("user_properties", "description", "TEXT", "TEXT"),
        ("user_properties", "bedrooms", "INTEGER", "INTEGER"),
        ("user_properties", "bathrooms", "FLOAT", "FLOAT"),
        ("user_properties", "sqft", "INTEGER", "INTEGER"),
        ("user_properties", "lot_size", "FLOAT", "FLOAT"),
        ("user_properties", "year_built", "INTEGER", "INTEGER"),
        ("user_properties", "owner_name", "VARCHAR(255)", "VARCHAR(255)"),
        ("user_properties", "auction_date", "DATE", "DATE"),
        ("user_properties", "amount_due", "FLOAT", "FLOAT"),
        ("user_properties", "list_id", "INTEGER REFERENCES client_lists(id) ON DELETE SET NULL", "INTEGER"),
        
        # Advanced Feature Expansion
        ("users", "company_id", "INTEGER REFERENCES companies(id) ON DELETE SET NULL", "INTEGER"),
        ("users", "created_by_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL", "INTEGER"),
        ("users", "permissions", "TEXT", "TEXT"),
        ("activity_logs", "entity_type", "VARCHAR(100)", "VARCHAR(100)"),
        ("activity_logs", "entity_id", "VARCHAR(100)", "VARCHAR(100)"),
        ("activity_logs", "metadata_json", "TEXT", "TEXT"),
        ("property_details", "visibility", "VARCHAR(50) DEFAULT 'public'", "VARCHAR(50) DEFAULT 'public'"),
    ]

    with engine.connect() as conn:
        inspector = inspect(engine)
        for table, column, pg_def, sqlite_def in migrations:
            try:
                existing_tables = inspector.get_table_names()
                if table not in existing_tables:
                    continue
                existing_cols = [c["name"] for c in inspector.get_columns(table)]
                if column in existing_cols:
                    continue  # Already exists — skip

                col_def = pg_def if is_postgres else sqlite_def
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}"))
                conn.commit()
                print(f"✅ Migration: Added column '{column}' to '{table}'")
            except Exception as e:
                print(f"⚠️  Migration warning for {table}.{column}: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Run safe column migrations FIRST (before create_all)
    try:
        run_safe_migrations()
    except Exception as e:
        print(f"Migration error (non-fatal): {e}")

    # 2. Auto-create any new tables on startup
    # Removed Base.metadata.create_all(bind=engine) to prevent Alembic conflicts

    redis = aioredis.from_url(settings.REDIS_URL)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")

    task = asyncio.create_task(run_daily_task())

    yield

    task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Always include standard development and production origins
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "https://goauct.up.railway.app",
    "https://goauct-production.up.railway.app",
    "http://goauct-production.up.railway.app",
    "https://goauct-production-82cf.up.railway.app", # Potential staging alias
    "https://goauct.com",
    "https://www.goauct.com",
]

if settings.BACKEND_CORS_ORIGINS:
    if isinstance(settings.BACKEND_CORS_ORIGINS, str):
        origins.append(settings.BACKEND_CORS_ORIGINS)
    else:
        origins.extend([str(origin) for origin in settings.BACKEND_CORS_ORIGINS])

# Deduplicate and ensure no trailing slashes confuse the browser
origins = list(set([o.rstrip('/') for o in origins if o]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex="https://(goauct.*\\.up\\.railway\\.app|.*\\.goauct\\.com|goauct\\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")


# Ensure static directory exists
static_dir = os.path.join(os.getcwd(), "data")
os.makedirs(static_dir, exist_ok=True)

import uuid
from fastapi import Request
from app.core.logger import request_id_var, logger

@app.middleware("http")
async def log_requests(request: Request, call_next):
    req_id = str(uuid.uuid4())
    token = request_id_var.set(req_id)
    
    # Log start of request (we avoid logging health checks/static to keep it clean, but for now log all)
    if not request.url.path.startswith("/static"):
        logger.info(f"Incoming request", extra={"method": request.method, "path": request.url.path})
    
    response = await call_next(request)
    
    if not request.url.path.startswith("/static"):
        logger.info(f"Request completed", extra={"status_code": response.status_code})
    
    request_id_var.reset(token)
    return response

# Mount static files
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Mount client upload files
uploads_dir = os.getenv("UPLOADS_DIR", os.path.join(os.getcwd(), "uploads"))
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "GoAuct API is running", "environment": "production"}
