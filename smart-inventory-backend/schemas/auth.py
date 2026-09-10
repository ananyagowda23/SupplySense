from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    """Schema for user and organization registration."""

    email: EmailStr = Field(..., description="User's work email address")
    password: str = Field(..., min_length=8, description="User password (min 8 characters)")
    full_name: str = Field(..., min_length=2, description="User's full name")
    organization_name: str = Field(..., min_length=2, description="Name of the enterprise organization")
    organization_slug: Optional[str] = Field(None, description="Optional custom organization slug")


class LoginRequest(BaseModel):
    """Schema for user login credentials."""

    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., description="User password")


class TokenResponse(BaseModel):
    """Schema for authentication token response."""

    access_token: str = Field(..., description="Short-lived JWT access token")
    refresh_token: str = Field(..., description="Long-lived rotatable refresh token")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(..., description="Access token lifetime in seconds")
    organization_id: str = Field(..., description="Active tenant organization ID")
    role: str = Field(..., description="User's role within the active organization")


class RefreshTokenRequest(BaseModel):
    """Schema for token refresh request."""

    refresh_token: str = Field(..., description="Rotatable refresh token")


class SwitchOrganizationRequest(BaseModel):
    """Schema for switching active organization."""

    organization_id: str = Field(..., description="Target organization ID to switch to")


class UserProfileResponse(BaseModel):
    """Schema for /auth/me profile response."""

    id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    full_name: str = Field(..., description="User's full name")
    is_active: bool = Field(..., description="User active status")
    organization_id: str = Field(..., description="Active organization ID")
    organization_name: str = Field(..., description="Active organization name")
    organization_slug: str = Field(..., description="Active organization slug")
    role: str = Field(..., description="User's role in active organization")
    permissions: List[str] = Field(default_factory=list, description="Explicit permission codes")

    model_config = ConfigDict(from_attributes=True)


class LogoutRequest(BaseModel):
    """Schema for logging out and revoking refresh token."""

    refresh_token: str = Field(..., description="Refresh token to revoke")
