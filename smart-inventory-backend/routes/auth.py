from datetime import datetime, timezone
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config import ACCESS_TOKEN_EXPIRE_MINUTES
from database.db import get_db
from database.models import (
    Organization,
    RefreshToken,
    Role,
    User,
    UserOrganization,
)
from schemas.auth import (
    LoginRequest,
    LogoutRequest,
    RefreshTokenRequest,
    RegisterRequest,
    SwitchOrganizationRequest,
    TokenResponse,
    UserProfileResponse,
)
from utils.security import (
    create_access_token,
    generate_refresh_token_pair,
    get_current_tenant,
    get_current_user,
    get_user_permissions_for_org,
    hash_password,
    hash_refresh_token,
    verify_password,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _slugify(text: str) -> str:
    """Helper to convert string into a URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[-\s]+", "-", text)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user, create their enterprise organization, and assign ADMIN role."""
    # Check duplicate email
    existing_user = db.query(User).filter(User.email == request.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{request.email}' already exists",
        )

    # Determine organization slug
    slug = request.organization_slug or _slugify(request.organization_name)
    existing_org = db.query(Organization).filter(Organization.slug == slug).first()
    if existing_org:
        slug = f"{slug}-{int(datetime.now().timestamp())}"

    # Create User
    user = User(
        email=request.email.lower(),
        hashed_password=hash_password(request.password),
        full_name=request.full_name,
        is_active=True,
        is_superuser=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create Organization
    org = Organization(
        name=request.organization_name,
        slug=slug,
        is_active=True,
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    # Fetch ADMIN role (id=1)
    admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
    role_id = admin_role.id if admin_role else 1

    # Create UserOrganization membership
    user_org = UserOrganization(
        user_id=user.id,
        organization_id=org.id,
        role_id=role_id,
    )
    db.add(user_org)
    db.commit()

    # Generate token pair
    access_token = create_access_token(
        user_id=str(user.id),
        org_id=str(org.id),
        role_name="ADMIN",
    )
    raw_refresh_token, _ = generate_refresh_token_pair(str(user.id), db)

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        organization_id=str(org.id),
        role="ADMIN",
    )


@router.post("/login", response_model=TokenResponse)
def login_user(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning JWT access & refresh tokens."""
    user = db.query(User).filter(User.email == request.email.lower()).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    # Fetch user's first active organization membership
    user_org = (
        db.query(UserOrganization)
        .filter(UserOrganization.user_id == user.id)
        .first()
    )
    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of any organization",
        )

    org = (
        db.query(Organization)
        .filter(Organization.id == user_org.organization_id)
        .first()
    )
    if not org or not org.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization account is inactive",
        )

    role_name, _ = get_user_permissions_for_org(str(user.id), str(org.id), db)

    # Generate token pair
    access_token = create_access_token(
        user_id=str(user.id),
        org_id=str(org.id),
        role_name=role_name,
    )
    raw_refresh_token, _ = generate_refresh_token_pair(str(user.id), db)

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        organization_id=str(org.id),
        role=role_name,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using rotatable refresh token."""
    hashed_input_token = hash_refresh_token(request.refresh_token)

    db_token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == hashed_input_token)
        .first()
    )

    if not db_token or db_token.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    now = datetime.now(timezone.utc)
    token_expires = db_token.expires_at
    if token_expires.tzinfo is None:
        token_expires = token_expires.replace(tzinfo=timezone.utc)

    if token_expires < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == db_token.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    # Refresh Token Rotation: Revoke old token
    db_token.is_revoked = True
    db.commit()

    # Get active org and role
    user_org = (
        db.query(UserOrganization)
        .filter(UserOrganization.user_id == user.id)
        .first()
    )
    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of any organization",
        )

    role_name, _ = get_user_permissions_for_org(str(user.id), str(user_org.organization_id), db)

    # Issue new token pair
    access_token = create_access_token(
        user_id=str(user.id),
        org_id=str(user_org.organization_id),
        role_name=role_name,
    )
    new_raw_refresh_token, _ = generate_refresh_token_pair(str(user.id), db)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_raw_refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        organization_id=str(user_org.organization_id),
        role=role_name,
    )


@router.post("/logout")
def logout_user(request: LogoutRequest, db: Session = Depends(get_db)):
    """Revoke refresh token and log user out."""
    hashed_input_token = hash_refresh_token(request.refresh_token)

    db_token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == hashed_input_token)
        .first()
    )

    if db_token:
        db_token.is_revoked = True
        db.commit()

    return {"status": "success", "message": "Successfully logged out"}


@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    current_org: Organization = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    """Retrieve currently authenticated user profile, active tenant, role, and explicit permissions."""
    role_name, permissions = get_user_permissions_for_org(
        str(current_user.id), str(current_org.id), db
    )

    return UserProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        organization_id=str(current_org.id),
        organization_name=current_org.name,
        organization_slug=current_org.slug,
        role=role_name,
        permissions=permissions,
    )


@router.post("/switch-organization", response_model=TokenResponse)
def switch_organization(
    request: SwitchOrganizationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Switch active tenant organization if authenticated user is a valid member."""
    user_org = (
        db.query(UserOrganization)
        .filter(
            UserOrganization.user_id == current_user.id,
            UserOrganization.organization_id == request.organization_id,
        )
        .first()
    )

    if not user_org:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization",
        )

    target_org = (
        db.query(Organization)
        .filter(Organization.id == request.organization_id)
        .first()
    )
    if not target_org or not target_org.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Target organization is inactive",
        )

    role_name, _ = get_user_permissions_for_org(
        str(current_user.id), str(target_org.id), db
    )

    # Issue new token pair for target organization
    access_token = create_access_token(
        user_id=str(current_user.id),
        org_id=str(target_org.id),
        role_name=role_name,
    )
    raw_refresh_token, _ = generate_refresh_token_pair(str(current_user.id), db)

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        organization_id=str(target_org.id),
        role=role_name,
    )
