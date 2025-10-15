"""Tests for authentication API endpoints"""

import pytest
from fastapi import status
from jose import jwt

from app.config import settings
from app.core.security import verify_token


class TestLogin:
    """Tests for POST /auth/login endpoint"""

    def test_login_success(self, client, test_user):
        """Test successful login with valid credentials"""
        response = client.post(
            "/auth/login",
            json={
                "email": test_user["email"],
                "password": test_user["password"],
            },
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        # Verify access token
        access_payload = verify_token(data["access_token"], expected_type="access")
        assert access_payload["user_id"] == test_user["id"]
        assert access_payload["email"] == test_user["email"]
        assert access_payload["type"] == "access"

        # Verify refresh token
        refresh_payload = verify_token(data["refresh_token"], expected_type="refresh")
        assert refresh_payload["user_id"] == test_user["id"]
        assert refresh_payload["type"] == "refresh"

    def test_login_invalid_email(self, client):
        """Test login with non-existent email"""
        response = client.post(
            "/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "somepassword123",
            },
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.json()["detail"] == "Incorrect email or password"

    def test_login_invalid_password(self, client, test_user):
        """Test login with incorrect password"""
        response = client.post(
            "/auth/login",
            json={
                "email": test_user["email"],
                "password": "wrongpassword123",
            },
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.json()["detail"] == "Incorrect email or password"

    def test_login_inactive_user(self, client, test_user, db):
        """Test login with inactive user account"""
        # Deactivate user
        user_obj = test_user["user_obj"]
        user_obj.is_active = False
        db.commit()

        response = client.post(
            "/auth/login",
            json={
                "email": test_user["email"],
                "password": test_user["password"],
            },
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["detail"] == "Inactive user account"

    def test_login_invalid_email_format(self, client):
        """Test login with invalid email format"""
        response = client.post(
            "/auth/login",
            json={
                "email": "not-an-email",
                "password": "somepassword123",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_login_short_password(self, client):
        """Test login with password shorter than 8 characters"""
        response = client.post(
            "/auth/login",
            json={
                "email": "test@example.com",
                "password": "short",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_login_missing_email(self, client):
        """Test login without email field"""
        response = client.post(
            "/auth/login",
            json={
                "password": "somepassword123",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_login_missing_password(self, client):
        """Test login without password field"""
        response = client.post(
            "/auth/login",
            json={
                "email": "test@example.com",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestRefreshToken:
    """Tests for POST /auth/refresh endpoint"""

    def test_refresh_success(self, client, test_user):
        """Test successful token refresh with valid refresh token"""
        # First, login to get tokens
        login_response = client.post(
            "/auth/login",
            json={
                "email": test_user["email"],
                "password": test_user["password"],
            },
        )
        refresh_token = login_response.json()["refresh_token"]

        # Refresh tokens
        response = client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        # Verify new access token
        access_payload = verify_token(data["access_token"], expected_type="access")
        assert access_payload["user_id"] == test_user["id"]
        assert access_payload["email"] == test_user["email"]

        # Verify new refresh token
        refresh_payload = verify_token(data["refresh_token"], expected_type="refresh")
        assert refresh_payload["user_id"] == test_user["id"]

        # New tokens should be different from old ones
        assert data["access_token"] != login_response.json()["access_token"]
        assert data["refresh_token"] != refresh_token

    def test_refresh_invalid_token(self, client):
        """Test refresh with invalid token"""
        response = client.post(
            "/auth/refresh",
            json={"refresh_token": "invalid.token.here"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.json()["detail"] == "Could not validate refresh token"

    def test_refresh_with_access_token(self, client, test_user):
        """Test refresh with access token instead of refresh token"""
        # First, login to get tokens
        login_response = client.post(
            "/auth/login",
            json={
                "email": test_user["email"],
                "password": test_user["password"],
            },
        )
        access_token = login_response.json()["access_token"]

        # Try to refresh using access token
        response = client.post(
            "/auth/refresh",
            json={"refresh_token": access_token},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_expired_token(self, client):
        """Test refresh with expired token"""
        # Create an expired refresh token
        from datetime import datetime, timedelta, timezone

        expired_payload = {
            "user_id": "test-user-id",
            "type": "refresh",
            "exp": datetime.now(timezone.utc) - timedelta(days=1),  # Expired 1 day ago
        }

        expired_token = jwt.encode(
            expired_payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

        response = client.post(
            "/auth/refresh",
            json={"refresh_token": expired_token},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_inactive_user(self, client, test_user, db):
        """Test refresh with inactive user account"""
        # First, login to get tokens
        login_response = client.post(
            "/auth/login",
            json={
                "email": test_user["email"],
                "password": test_user["password"],
            },
        )
        refresh_token = login_response.json()["refresh_token"]

        # Deactivate user
        user_obj = test_user["user_obj"]
        user_obj.is_active = False
        db.commit()

        # Try to refresh
        response = client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["detail"] == "Inactive user account"

    def test_refresh_deleted_user(self, client, test_user, db):
        """Test refresh with deleted user"""
        # First, login to get tokens
        login_response = client.post(
            "/auth/login",
            json={
                "email": test_user["email"],
                "password": test_user["password"],
            },
        )
        refresh_token = login_response.json()["refresh_token"]

        # Delete user
        db.delete(test_user["user_obj"])
        db.commit()

        # Try to refresh
        response = client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["detail"] == "User not found"

    def test_refresh_missing_token(self, client):
        """Test refresh without token field"""
        response = client.post("/auth/refresh", json={})

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestRegister:
    """Tests for POST /auth/register endpoint"""

    def test_register_success(self, client):
        """Test successful user registration"""
        response = client.post(
            "/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "newpassword123",
            },
        )

        assert response.status_code == status.HTTP_201_CREATED

        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["is_active"] is True
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data
        assert "hashed_password" not in data  # Should not expose password

    def test_register_duplicate_email(self, client, test_user):
        """Test registration with already registered email"""
        response = client.post(
            "/auth/register",
            json={
                "email": test_user["email"],
                "password": "anotherpassword123",
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["detail"] == "Email already registered"

    def test_register_invalid_email(self, client):
        """Test registration with invalid email format"""
        response = client.post(
            "/auth/register",
            json={
                "email": "not-an-email",
                "password": "somepassword123",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_short_password(self, client):
        """Test registration with password shorter than 8 characters"""
        response = client.post(
            "/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "short",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_missing_email(self, client):
        """Test registration without email field"""
        response = client.post(
            "/auth/register",
            json={
                "password": "somepassword123",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_missing_password(self, client):
        """Test registration without password field"""
        response = client.post(
            "/auth/register",
            json={
                "email": "newuser@example.com",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_can_login_after(self, client):
        """Test that newly registered user can login"""
        # Register
        register_response = client.post(
            "/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "newpassword123",
            },
        )
        assert register_response.status_code == status.HTTP_201_CREATED

        # Login with new credentials
        login_response = client.post(
            "/auth/login",
            json={
                "email": "newuser@example.com",
                "password": "newpassword123",
            },
        )

        assert login_response.status_code == status.HTTP_200_OK
        assert "access_token" in login_response.json()
