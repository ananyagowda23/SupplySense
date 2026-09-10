import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent

# Environment Mode ("development", "staging", "production")
ENVIRONMENT = os.getenv("ENVIRONMENT", os.getenv("ENV", "development")).lower()
IS_PRODUCTION = ENVIRONMENT == "production"

# Database Configuration
raw_db_url = os.getenv("DATABASE_URL", "sqlite:///./inventory.db")
# Convert legacy 'postgres://' (Render format) to 'postgresql://' for SQLAlchemy 2.0
if raw_db_url.startswith("postgres://"):
    DATABASE_URL = raw_db_url.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = raw_db_url

# Saved Models Configuration
SAVED_MODELS_DIR = BASE_DIR / "training" / "saved_models"

def _resolve_model_path(env_var: str, default_filename: str) -> str:
    raw = os.getenv(env_var)
    if raw:
        p = Path(raw)
        if not p.is_absolute():
            return str((BASE_DIR / p).resolve())
        return str(p.resolve())
    return str((SAVED_MODELS_DIR / default_filename).resolve())

CQL_MODEL_PATH = _resolve_model_path("CQL_MODEL_PATH", "cql_supply_chain.pt")
PPO_MODEL_PATH = _resolve_model_path("PPO_MODEL_PATH", "ppo_supply_chain.zip")

# Security & JWT Configuration
DEFAULT_DEV_SECRET = "dev_secret_key_change_in_production_32bytes_min"


def get_jwt_secret(env: str = ENVIRONMENT, secret_override: str = None) -> str:
    """Retrieve and validate JWT_SECRET_KEY based on deployment environment."""
    secret = secret_override if secret_override is not None else os.getenv("JWT_SECRET_KEY")
    if secret:
        secret = secret.strip()
    is_prod = env.lower() == "production"

    if is_prod:
        if not secret or secret == DEFAULT_DEV_SECRET or len(secret) < 32:
            raise RuntimeError(
                "FATAL SECURITY ERROR: JWT_SECRET_KEY must be explicitly configured with a secure "
                "string of at least 32 characters when ENVIRONMENT=production."
            )
        return secret
    else:
        if not secret:
            logger.warning("Using default development JWT secret key. Do not use in production.")
            return DEFAULT_DEV_SECRET
        return secret


JWT_SECRET_KEY = get_jwt_secret()
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "14"))

# CORS Configuration
DEFAULT_DEV_CORS_ORIGINS = [
    "http://localhost:8081",
    "http://localhost:19006",
    "http://localhost:3000",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:19006",
    "*",
]
CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS", "")
if CORS_ORIGINS_RAW:
    CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_RAW.split(",") if origin.strip()]
else:
    if IS_PRODUCTION:
        # In production, wildcard origin is restricted if credentials allowed
        logger.info("CORS_ORIGINS not explicitly set in production; restricting wildcard credentials.")
        CORS_ORIGINS = []
    else:
        CORS_ORIGINS = DEFAULT_DEV_CORS_ORIGINS

# Cost Model Default Parameters
UNIT_PURCHASE_COST_RATIO = float(os.getenv("UNIT_PURCHASE_COST_RATIO", "0.6"))
HOLDING_COST_RATIO = float(os.getenv("HOLDING_COST_RATIO", "0.02"))
SHORTAGE_COST_RATIO = float(os.getenv("SHORTAGE_COST_RATIO", "1.5"))
EXPEDITE_FIXED_FEE = float(os.getenv("EXPEDITE_FIXED_FEE", "50.0"))

# Default Development Organization Constants
DEFAULT_ORG_ID = os.getenv("DEFAULT_ORG_ID", "00000000-0000-0000-0000-000000000001")
DEFAULT_ORG_NAME = os.getenv("DEFAULT_ORG_NAME", "SupplySense Development")
DEFAULT_ORG_SLUG = os.getenv("DEFAULT_ORG_SLUG", "supplysense-dev")


