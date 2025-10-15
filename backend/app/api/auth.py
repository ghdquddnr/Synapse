"""Authentication API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import JWTError

from app.core.deps import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
)
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    RegisterRequest,
    UserResponse,
)
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
) -> TokenResponse:
    """
    Authenticate user and return JWT tokens.

    Flow:
    1. Validate email and password from request
    2. Query user from database by email
    3. Verify password against hashed password
    4. Generate access token (1 hour expiration)
    5. Generate refresh token (30 days expiration)
    6. Return both tokens with token_type and expires_in

    Args:
        login_data: Login credentials (email, password)
        db: Database session

    Returns:
        TokenResponse: Access token, refresh token, token type, and expiration

    Raises:
        HTTPException 401: If email not found or password is incorrect
        HTTPException 403: If user account is inactive

    Example:
        POST /auth/login
        {
            "email": "user@example.com",
            "password": "securepassword123"
        }

        Response:
        {
            "access_token": "eyJ0eXAi...",
            "refresh_token": "eyJ0eXAi...",
            "token_type": "bearer",
            "expires_in": 3600
        }
    """
    # Query user by email
    user = db.query(User).filter(User.email == login_data.email).first()

    # Check if user exists
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    # Create token payload
    token_data = {
        "user_id": user.id,
        "email": user.email,
    }

    # Generate tokens
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token({"user_id": user.id})

    # Return token response
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
    )


@router.post("/refresh", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def refresh_access_token(
    refresh_data: RefreshRequest,
    db: Session = Depends(get_db)
) -> TokenResponse:
    """
    Refresh access token using a valid refresh token.

    Flow:
    1. Verify refresh token (check signature, expiration, type)
    2. Extract user_id from token payload
    3. Query user from database
    4. Verify user is still active
    5. Generate new access token (1 hour expiration)
    6. Generate new refresh token (30 days expiration)
    7. Return new tokens

    Args:
        refresh_data: Refresh token request
        db: Database session

    Returns:
        TokenResponse: New access token, refresh token, token type, and expiration

    Raises:
        HTTPException 401: If refresh token is invalid, expired, or wrong type
        HTTPException 403: If user not found or account is inactive

    Example:
        POST /auth/refresh
        {
            "refresh_token": "eyJ0eXAi..."
        }

        Response:
        {
            "access_token": "eyJ0eXAi...",
            "refresh_token": "eyJ0eXAi...",
            "token_type": "bearer",
            "expires_in": 3600
        }
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Verify refresh token
        payload = verify_token(refresh_data.refresh_token, expected_type="refresh")

        # Extract user_id
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # Query user from database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not found",
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    # Create token payload
    token_data = {
        "user_id": user.id,
        "email": user.email,
    }

    # Generate new tokens
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token({"user_id": user.id})

    # Return token response
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    register_data: RegisterRequest,
    db: Session = Depends(get_db)
) -> UserResponse:
    """
    Register a new user account.

    Note: This endpoint is optional for M1 (MVP).
    In production, you may want to add email verification,
    rate limiting, and CAPTCHA.

    Flow:
    1. Check if email already exists
    2. Hash password using bcrypt
    3. Generate UUIDv7 for user_id
    4. Create User record in database
    5. Return user information (without password)

    Args:
        register_data: Registration credentials (email, password)
        db: Database session

    Returns:
        UserResponse: Created user information

    Raises:
        HTTPException 400: If email already registered

    Example:
        POST /auth/register
        {
            "email": "newuser@example.com",
            "password": "securepassword123"
        }

        Response:
        {
            "id": "01234567-89ab-cdef-0123-456789abcdef",
            "email": "newuser@example.com",
            "is_active": true,
            "created_at": "2025-01-15T10:30:00Z",
            "updated_at": "2025-01-15T10:30:00Z"
        }
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == register_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Hash password
    hashed_password = hash_password(register_data.password)

    # Generate UUIDv7 for user_id
    # Note: In production, use a proper UUIDv7 library or generate on client
    # For now, we'll use a simple UUID4 as placeholder
    import uuid
    user_id = str(uuid.uuid4())

    # Create user
    new_user = User(
        id=user_id,
        email=register_data.email,
        hashed_password=hashed_password,
        is_active=True,
    )

    # Save to database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Return user response
    return UserResponse.model_validate(new_user)
