from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import app
from config import DEFAULT_ORG_ID
from database.db import Base, get_db, init_db
from database.models import (
    Organization,
    RefreshToken,
    Role,
    User,
    UserOrganization,
)
from utils.security import create_access_token, hash_password, verify_password

# Initialize test database and client
client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_and_teardown_auth_test_data():
    db = next(get_db())
    try:
        user = db.query(User).filter(User.email == "owner@acme.com").first()
        if user:
            db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete()
            db.query(UserOrganization).filter(UserOrganization.user_id == user.id).delete()
            db.delete(user)
        for slug in ["acme-corporation", "second-corp", "third-corp", "duplicate-corp"]:
            org = db.query(Organization).filter(Organization.slug == slug).first()
            if org:
                db.query(UserOrganization).filter(UserOrganization.organization_id == org.id).delete()
                db.delete(org)
        db.commit()
    finally:
        db.close()
    yield


def test_auth_successful_registration():
    """Verify user & organization registration returning valid JWT tokens."""
    payload = {
        "email": "owner@acme.com",
        "password": "SecurePassword123!",
        "full_name": "Acme Owner",
        "organization_name": "Acme Corporation",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text

    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "ADMIN"
    assert "organization_id" in data


def test_auth_duplicate_email_rejection():
    """Verify duplicate user email registration is rejected with 400 Bad Request."""
    payload = {
        "email": "owner@acme.com",
        "password": "AnotherPassword123!",
        "full_name": "Duplicate User",
        "organization_name": "Duplicate Corp",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_auth_password_hashing_security():
    """Verify that passwords are cryptographically hashed and never stored in plaintext."""
    db = next(get_db())
    try:
        user = db.query(User).filter(User.email == "owner@acme.com").first()
        assert user is not None
        assert user.hashed_password != "SecurePassword123!"
        assert verify_password("SecurePassword123!", user.hashed_password) is True
        assert verify_password("WrongPassword!", user.hashed_password) is False
    finally:
        db.close()


def test_auth_successful_login():
    """Verify successful login returning access and refresh tokens."""
    payload = {
        "email": "owner@acme.com",
        "password": "SecurePassword123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200, response.text

    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["role"] == "ADMIN"


def test_auth_invalid_password_rejection():
    """Verify login with incorrect password is rejected with 401 Unauthorized."""
    payload = {
        "email": "owner@acme.com",
        "password": "WrongPassword123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_auth_inactive_user_rejection():
    """Verify deactivated user accounts cannot log in or authenticate."""
    db = next(get_db())
    try:
        user = db.query(User).filter(User.email == "owner@acme.com").first()
        user.is_active = False
        db.commit()
    finally:
        db.close()

    # Attempt login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@acme.com", "password": "SecurePassword123!"},
    )
    assert login_resp.status_code == 403
    assert "Account is inactive" in login_resp.json()["detail"]

    # Restore user active status
    db = next(get_db())
    try:
        user = db.query(User).filter(User.email == "owner@acme.com").first()
        user.is_active = True
        db.commit()
    finally:
        db.close()


def test_auth_me_endpoint_and_token_validation():
    """Verify /auth/me returns profile, tenant info, role, and explicit permissions."""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@acme.com", "password": "SecurePassword123!"},
    )
    access_token = login_resp.json()["access_token"]

    headers = {"Authorization": f"Bearer {access_token}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200, me_resp.text

    profile = me_resp.json()
    assert profile["email"] == "owner@acme.com"
    assert profile["full_name"] == "Acme Owner"
    assert profile["role"] == "ADMIN"
    assert "products.read" in profile["permissions"]
    assert "users.write" in profile["permissions"]


def test_auth_expired_access_token_rejection():
    """Verify request with expired access token yields 401 Unauthorized."""
    db = next(get_db())
    try:
        user = db.query(User).filter(User.email == "owner@acme.com").first()
        user_org = db.query(UserOrganization).filter(UserOrganization.user_id == user.id).first()
        
        # Create an expired access token (-10 minutes)
        expired_token = create_access_token(
            user_id=str(user.id),
            org_id=str(user_org.organization_id),
            role_name="ADMIN",
            expires_delta=timedelta(minutes=-10),
        )
    finally:
        db.close()

    headers = {"Authorization": f"Bearer {expired_token}"}
    resp = client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 401
    assert "has expired" in resp.json()["detail"]


def test_auth_refresh_token_rotation_and_revocation():
    """Verify refresh token rotation and revocation behavior."""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@acme.com", "password": "SecurePassword123!"},
    )
    initial_refresh = login_resp.json()["refresh_token"]

    # Refresh token call
    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_refresh},
    )
    assert refresh_resp.status_code == 200, refresh_resp.text
    new_data = refresh_resp.json()
    new_refresh = new_data["refresh_token"]
    assert new_refresh != initial_refresh

    # Rotation check: attempt reusing old initial_refresh token -> 401
    reuse_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_refresh},
    )
    assert reuse_resp.status_code == 401
    assert "revoked" in reuse_resp.json()["detail"].lower()


def test_auth_logout_revocation():
    """Verify logout revokes refresh token in database."""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@acme.com", "password": "SecurePassword123!"},
    )
    refresh_token = login_resp.json()["refresh_token"]

    # Perform Logout
    logout_resp = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
    )
    assert logout_resp.status_code == 200
    assert logout_resp.json()["status"] == "success"

    # Attempting to refresh after logout must fail
    refresh_resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 401


def test_auth_organization_switching_and_unauthorized_switch():
    """Verify organization switching for valid member and rejection for unauthorized org."""
    db = next(get_db())
    try:
        user = db.query(User).filter(User.email == "owner@acme.com").first()
        
        # Clean up second/third org if leftover
        for slug in ["second-corp", "third-corp"]:
            existing_org = db.query(Organization).filter(Organization.slug == slug).first()
            if existing_org:
                db.query(UserOrganization).filter(UserOrganization.organization_id == existing_org.id).delete()
                db.delete(existing_org)
        db.commit()

        # Create second organization
        org2 = Organization(name="Second Corp", slug="second-corp", is_active=True)
        db.add(org2)
        db.commit()
        db.refresh(org2)
        
        # Add user as MANAGER in org2 (role_id=2)
        uo2 = UserOrganization(user_id=user.id, organization_id=org2.id, role_id=2)
        db.add(uo2)
        
        # Create un-joined third organization
        org3 = Organization(name="Third Unjoined Corp", slug="third-corp", is_active=True)
        db.add(org3)
        db.commit()
        db.refresh(org3)
        
        org2_id = str(org2.id)
        org3_id = str(org3.id)
    finally:
        db.close()

    # Login to get access token
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@acme.com", "password": "SecurePassword123!"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Switch to joined Org 2 -> Success
    switch_resp = client.post(
        "/api/v1/auth/switch-organization",
        headers=headers,
        json={"organization_id": org2_id},
    )
    assert switch_resp.status_code == 200, switch_resp.text
    switch_data = switch_resp.json()
    assert switch_data["organization_id"] == org2_id
    assert switch_data["role"] == "MANAGER"

    # 2. Switch to un-joined Org 3 -> 403 Forbidden
    unauth_resp = client.post(
        "/api/v1/auth/switch-organization",
        headers=headers,
        json={"organization_id": org3_id},
    )
    assert unauth_resp.status_code == 403
    assert "not a member" in unauth_resp.json()["detail"]


if __name__ == "__main__":
    pytest.main(["-v", __file__])
