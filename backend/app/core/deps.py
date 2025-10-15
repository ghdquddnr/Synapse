"""Dependency injection functions for FastAPI"""

from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError

from app.database import SessionLocal
from app.core.security import verify_token
from app.models.user import User

# HTTP Bearer token security scheme
security = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.

    Yields a SQLAlchemy database session and ensures it's closed after use.

    Usage in FastAPI endpoints:
        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            return db.query(Item).all()

    Yields:
        Session: SQLAlchemy database session

    Example:
        >>> from fastapi import Depends
        >>> def my_endpoint(db: Session = Depends(get_db)):
        ...     users = db.query(User).all()
        ...     return users
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency function to get current authenticated user from JWT token.

    Extracts JWT token from Authorization header, verifies it,
    and returns the corresponding User object from database.

    Args:
        credentials: HTTP Bearer credentials (injected by FastAPI)
        db: Database session (injected by FastAPI)

    Returns:
        User: Authenticated user object

    Raises:
        HTTPException 401: If token is invalid, expired, or user not found
        HTTPException 403: If user account is inactive

    Usage in FastAPI endpoints:
        @app.get("/me")
        def read_current_user(current_user: User = Depends(get_current_user)):
            return current_user

    Example:
        >>> # In your API endpoint
        >>> @app.get("/profile")
        >>> def get_profile(user: User = Depends(get_current_user)):
        ...     return {"email": user.email, "id": user.id}
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Extract token from credentials
        token = credentials.credentials

        # Verify and decode token
        payload = verify_token(token, expected_type="access")

        # Extract user_id from payload
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # Query user from database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account"
        )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency function to ensure current user is active.

    This is a convenience wrapper around get_current_user that
    explicitly checks for active status. In practice, get_current_user
    already checks this, so this function is mainly for clarity.

    Args:
        current_user: Current user (injected by get_current_user)

    Returns:
        User: Active user object

    Raises:
        HTTPException 403: If user account is inactive

    Example:
        >>> @app.post("/notes")
        >>> def create_note(user: User = Depends(get_current_active_user)):
        ...     # User is guaranteed to be active here
        ...     pass
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account"
        )
    return current_user


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User | None:
    """
    Dependency function to optionally get current user.

    Unlike get_current_user, this does not raise an exception
    if the token is invalid or missing. Returns None instead.

    Useful for endpoints that have optional authentication.

    Args:
        credentials: HTTP Bearer credentials (injected by FastAPI)
        db: Database session (injected by FastAPI)

    Returns:
        User or None: Authenticated user object or None if not authenticated

    Example:
        >>> @app.get("/public-notes")
        >>> def get_notes(user: User | None = Depends(get_optional_current_user)):
        ...     if user:
        ...         # Show user's private notes
        ...         return user.notes
        ...     else:
        ...         # Show public notes only
        ...         return public_notes
    """
    try:
        token = credentials.credentials
        payload = verify_token(token, expected_type="access")
        user_id: str = payload.get("user_id")

        if user_id is None:
            return None

        user = db.query(User).filter(User.id == user_id).first()
        if user is None or not user.is_active:
            return None

        return user

    except (JWTError, Exception):
        return None
