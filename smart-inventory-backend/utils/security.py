from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import List, Optional, Tuple
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_ALGORITHM,
    JWT_SECRET_KEY,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from database.db import get_db
from database.models import (
    Organization,
    Permission,
    RefreshToken,
    Role,
    RolePermission,
    User,
    UserOrganization,
)

# Modern, secure password hashing stack using pwdlib
password_hash = PasswordHash.recommended()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    """Hash a plaintext password using pwdlib recommended hasher (Argon2 / Bcrypt)."""
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Securely verify plaintext password against stored hash."""
    try:
        return password_hash.verify(plain_password, hashed_password)
    except Exception:
        return False


def create_access_token(
    user_id: str,
    org_id: str,
    role_name: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a short-lived access JWT containing user_id (sub), org_id, role, exp, iat."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(user_id),
        "org_id": str(org_id),
        "role": role_name,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "access",
    }
    encoded_jwt = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def generate_refresh_token_pair(user_id: str, db: Session) -> Tuple[str, RefreshToken]:
    """Generate a secure random refresh token string and save its hash to the database."""
    raw_token = secrets.token_urlsafe(64)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    db_token = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        is_revoked=False,
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return raw_token, db_token


def hash_refresh_token(raw_token: str) -> str:
    """Hash a raw refresh token using SHA-256 for database lookup."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def decode_token(token: str) -> dict:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired",
            headers={"WWW-Authenticate": 'Bearer error="token_expired"'},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency resolving and validating the currently authenticated user."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    return user


def get_current_tenant(
    token: Optional[str] = Depends(oauth2_scheme),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    db: Session = Depends(get_db),
) -> Organization:
    """FastAPI dependency resolving the current active tenant organization and verifying user membership."""
    current_user = get_current_user(token=token, db=db)

    payload = decode_token(token) if token else {}
    token_org_id = payload.get("org_id")

    org_id_to_check = x_organization_id or token_org_id

    if not org_id_to_check:
        # Fallback to user's first organization
        user_org = (
            db.query(UserOrganization)
            .filter(UserOrganization.user_id == current_user.id)
            .first()
        )
        if not user_org:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a member of any organization",
            )
        org_id_to_check = str(user_org.organization_id)

    # Check user membership in the organization
    user_org = (
        db.query(UserOrganization)
        .filter(
            UserOrganization.user_id == current_user.id,
            UserOrganization.organization_id == org_id_to_check,
        )
        .first()
    )
    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this organization",
        )

    org = (
        db.query(Organization)
        .filter(Organization.id == org_id_to_check)
        .first()
    )
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    if not org.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization account is inactive",
        )

    return org


def get_user_permissions_for_org(
    user_id: str, org_id: str, db: Session
) -> Tuple[str, List[str]]:
    """Fetch user's role name and explicit permission codes for a given organization."""
    user_org = (
        db.query(UserOrganization)
        .filter(
            UserOrganization.user_id == str(user_id),
            UserOrganization.organization_id == str(org_id),
        )
        .first()
    )
    if not user_org:
        return ("NONE", [])

    role = db.query(Role).filter(Role.id == user_org.role_id).first()
    role_name = role.name if role else "UNKNOWN"

    perms = (
        db.query(Permission.code)
        .join(RolePermission, Permission.id == RolePermission.permission_id)
        .filter(RolePermission.role_id == user_org.role_id)
        .all()
    )
    perm_codes = [p[0] for p in perms]
    return (role_name, perm_codes)


def require_permission(permission_code: str):
    """Reusable FastAPI dependency returning a checker function that verifies if the authenticated
    user possesses the specified permission within their current active tenant organization.
    """
    def dependency(
        current_user: User = Depends(get_current_user),
        current_org: Organization = Depends(get_current_tenant),
        db: Session = Depends(get_db),
    ) -> Tuple[User, Organization]:
        user_org = (
            db.query(UserOrganization)
            .filter(
                UserOrganization.user_id == current_user.id,
                UserOrganization.organization_id == current_org.id,
            )
            .first()
        )
        if not user_org:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a member of this organization",
            )

        if current_user.is_superuser:
            return (current_user, current_org)

        has_perm = (
            db.query(RolePermission)
            .join(Permission, RolePermission.permission_id == Permission.id)
            .filter(
                RolePermission.role_id == user_org.role_id,
                Permission.code == permission_code,
            )
            .first()
        )

        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission_code}' required for this action",
            )

        return (current_user, current_org)

    return dependency

