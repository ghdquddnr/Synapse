"""Tests for security functions (JWT, password hashing)"""

import pytest
from datetime import datetime, timedelta, timezone
from jose import JWTError

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    get_token_expiration,
)
from app.config import settings


class TestPasswordHashing:
    """Test password hashing and verification"""

    def test_hash_password_returns_different_hash_each_time(self):
        """Password hashing should use salt (different hash each time)"""
        password = "testpassword123"
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        assert hash1 != hash2  # Salt makes each hash unique
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)

    def test_verify_password_correct(self):
        """Verify password should return True for correct password"""
        password = "mySecurePassword123!"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Verify password should return False for incorrect password"""
        password = "mySecurePassword123!"
        hashed = hash_password(password)

        assert verify_password("wrongpassword", hashed) is False

    def test_hash_password_with_special_characters(self):
        """Password hashing should handle special characters"""
        password = "p@ssw0rd!#$%^&*()"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True

    def test_hash_password_with_unicode(self):
        """Password hashing should handle unicode characters"""
        password = "비밀번호123안녕"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True


class TestAccessToken:
    """Test JWT access token creation and verification"""

    def test_create_access_token(self):
        """Access token should be created with user data"""
        data = {"user_id": "123", "email": "test@example.com"}
        token = create_access_token(data)

        assert isinstance(token, str)
        assert len(token) > 0

    def test_verify_access_token(self):
        """Access token should be verifiable and return correct data"""
        data = {"user_id": "123", "email": "test@example.com"}
        token = create_access_token(data)

        payload = verify_token(token, expected_type="access")

        assert payload["user_id"] == "123"
        assert payload["email"] == "test@example.com"
        assert payload["type"] == "access"
        assert "exp" in payload

    def test_access_token_expiration_time(self):
        """Access token should have correct expiration time"""
        data = {"user_id": "123"}
        token = create_access_token(data)

        exp_time = get_token_expiration(token)
        expected_exp = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

        # Allow 5 second tolerance for test execution time
        time_diff = abs((exp_time - expected_exp.replace(tzinfo=None)).total_seconds())
        assert time_diff < 5

    def test_verify_wrong_token_type(self):
        """Verifying access token as refresh should raise error"""
        data = {"user_id": "123"}
        token = create_access_token(data)

        with pytest.raises(JWTError, match="Invalid token type"):
            verify_token(token, expected_type="refresh")

    def test_verify_invalid_token(self):
        """Verifying invalid token should raise JWTError"""
        invalid_token = "invalid.token.string"

        with pytest.raises(JWTError):
            verify_token(invalid_token, expected_type="access")

    def test_verify_expired_token(self):
        """Verifying expired token should raise JWTError"""
        # Create a token that expires immediately
        from jose import jwt
        from app.config import settings

        data = {"user_id": "123", "type": "access"}
        expire = datetime.now(timezone.utc) - timedelta(seconds=1)  # Already expired
        data.update({"exp": expire})

        expired_token = jwt.encode(
            data,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )

        with pytest.raises(JWTError):
            verify_token(expired_token, expected_type="access")


class TestRefreshToken:
    """Test JWT refresh token creation and verification"""

    def test_create_refresh_token(self):
        """Refresh token should be created with user data"""
        data = {"user_id": "456"}
        token = create_refresh_token(data)

        assert isinstance(token, str)
        assert len(token) > 0

    def test_verify_refresh_token(self):
        """Refresh token should be verifiable and return correct data"""
        data = {"user_id": "456"}
        token = create_refresh_token(data)

        payload = verify_token(token, expected_type="refresh")

        assert payload["user_id"] == "456"
        assert payload["type"] == "refresh"
        assert "exp" in payload

    def test_refresh_token_expiration_time(self):
        """Refresh token should have correct expiration time (30 days)"""
        data = {"user_id": "456"}
        token = create_refresh_token(data)

        exp_time = get_token_expiration(token)
        expected_exp = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

        # Allow 5 second tolerance
        time_diff = abs((exp_time - expected_exp.replace(tzinfo=None)).total_seconds())
        assert time_diff < 5

    def test_verify_refresh_token_as_access_fails(self):
        """Verifying refresh token as access should raise error"""
        data = {"user_id": "456"}
        token = create_refresh_token(data)

        with pytest.raises(JWTError, match="Invalid token type"):
            verify_token(token, expected_type="access")


class TestGetTokenExpiration:
    """Test token expiration extraction"""

    def test_get_token_expiration_valid_token(self):
        """Should return expiration datetime for valid token"""
        data = {"user_id": "789"}
        token = create_access_token(data)

        exp = get_token_expiration(token)

        assert isinstance(exp, datetime)
        assert exp > datetime.now(timezone.utc).replace(tzinfo=None)  # Should be in the future

    def test_get_token_expiration_invalid_token(self):
        """Should return None for invalid token"""
        invalid_token = "invalid.token"

        exp = get_token_expiration(invalid_token)

        assert exp is None

    def test_get_token_expiration_expired_token(self):
        """Should still return expiration datetime even if expired"""
        from jose import jwt
        from app.config import settings

        data = {"user_id": "123", "type": "access"}
        expire = datetime.now(timezone.utc) - timedelta(hours=1)  # Expired 1 hour ago
        data.update({"exp": expire})

        expired_token = jwt.encode(
            data,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )

        exp = get_token_expiration(expired_token)

        assert isinstance(exp, datetime)
        assert exp < datetime.now(timezone.utc).replace(tzinfo=None)  # Should be in the past
