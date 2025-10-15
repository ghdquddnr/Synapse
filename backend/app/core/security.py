"""Security utilities for JWT tokens and password hashing"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

# Password hashing context
# Using rounds=4 for faster tests (default is 12)
# In production, you may want to increase this
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__default_rounds=4,  # Faster for development/testing
)


def hash_password(password: str) -> str:
    """
    Hash a plain password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Hashed password string

    Example:
        >>> hashed = hash_password("mypassword123")
        >>> verify_password("mypassword123", hashed)
        True

    Note:
        Bcrypt has a maximum password length of 72 bytes.
        We truncate to 72 bytes if needed.
    """
    # Bcrypt has a 72 byte limit
    password_bytes = password.encode('utf-8')[:72]
    return pwd_context.hash(password_bytes)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.

    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to compare against

    Returns:
        True if password matches, False otherwise

    Example:
        >>> hashed = hash_password("mypassword123")
        >>> verify_password("mypassword123", hashed)
        True
        >>> verify_password("wrongpassword", hashed)
        False

    Note:
        Bcrypt has a maximum password length of 72 bytes.
        We truncate to 72 bytes if needed for consistency with hash_password.
    """
    # Bcrypt has a 72 byte limit
    password_bytes = plain_password.encode('utf-8')[:72]
    return pwd_context.verify(password_bytes, hashed_password)


def create_access_token(data: Dict[str, Any]) -> str:
    """
    Create a JWT access token.

    Args:
        data: Dictionary containing user data to encode in token
              Typically includes user_id, email, etc.

    Returns:
        Encoded JWT token string

    Example:
        >>> token = create_access_token({"user_id": "123", "email": "user@example.com"})
        >>> # Token expires after ACCESS_TOKEN_EXPIRE_MINUTES (default 60 minutes)
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """
    Create a JWT refresh token.

    Args:
        data: Dictionary containing user data to encode in token
              Typically includes user_id only

    Returns:
        Encoded JWT token string

    Example:
        >>> token = create_refresh_token({"user_id": "123"})
        >>> # Token expires after REFRESH_TOKEN_EXPIRE_DAYS (default 30 days)
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def verify_token(token: str, expected_type: str = "access") -> Dict[str, Any]:
    """
    Verify and decode a JWT token.

    Args:
        token: JWT token string to verify
        expected_type: Expected token type ("access" or "refresh")

    Returns:
        Decoded token payload as dictionary

    Raises:
        JWTError: If token is invalid, expired, or wrong type

    Example:
        >>> token = create_access_token({"user_id": "123"})
        >>> payload = verify_token(token, "access")
        >>> payload["user_id"]
        '123'
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )

        # Verify token type
        token_type = payload.get("type")
        if token_type != expected_type:
            raise JWTError(f"Invalid token type: expected {expected_type}, got {token_type}")

        return payload

    except JWTError as e:
        raise JWTError(f"Token verification failed: {str(e)}")


def get_token_expiration(token: str) -> Optional[datetime]:
    """
    Get the expiration datetime of a token without full verification.

    Args:
        token: JWT token string

    Returns:
        Expiration datetime or None if invalid

    Example:
        >>> token = create_access_token({"user_id": "123"})
        >>> exp = get_token_expiration(token)
        >>> isinstance(exp, datetime)
        True
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": False}  # Don't verify expiration
        )
        exp_timestamp = payload.get("exp")
        if exp_timestamp:
            return datetime.fromtimestamp(exp_timestamp)
        return None
    except JWTError:
        return None
