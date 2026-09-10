import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from config import CORS_ORIGINS, IS_PRODUCTION
from database.db import SessionLocal, init_db
from routes import (
    activity,
    analytics,
    auth,
    demand_history,
    forecast,
    inventory,
    orders,
    products,
    recommendations,
    settings,
    simulation,
    suppliers,
)
from services.model_manager import ModelManager

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on application startup safely
    init_db()
    yield


app = FastAPI(
    title="Smart Inventory Backend API",
    description="FastAPI Backend for Smart Inventory & Supply Chain Management System",
    version="1.4.0",
    lifespan=lifespan,
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
)

# Configure Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Global exception handler masking internal errors in production
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    if IS_PRODUCTION:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An internal server error occurred."},
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc)},
    )


# Configure CORS Middleware allowing requests from Expo frontend & configurable origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True if "*" not in CORS_ORIGINS and len(CORS_ORIGINS) > 0 else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Auth Router (/api/v1/auth)
app.include_router(auth.router)

# Register entity routers
app.include_router(products.router)
app.include_router(products.legacy_router)
app.include_router(suppliers.router)
app.include_router(inventory.router)
app.include_router(orders.router)
app.include_router(demand_history.router)
app.include_router(forecast.router)

# Register ML, Analytics, AI & Simulation routers
app.include_router(analytics.router)
app.include_router(recommendations.router)
app.include_router(simulation.router)
app.include_router(activity.router)
app.include_router(settings.router)



@app.get("/", tags=["health"])
def read_root():
    return {
        "status": "healthy",
        "message": "Welcome to Smart Inventory Backend API",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
def health_check():
    """Detailed health & readiness check verifying database and ML model status."""
    db_ok = False
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_ok = True
    except Exception:
        db_ok = False

    cql_ok = ModelManager.is_cql_loaded()

    return {
        "status": "healthy" if db_ok else "unhealthy",
        "database_connected": db_ok,
        "cql_model_loaded": cql_ok,
        "version": "1.4.0",
    }

