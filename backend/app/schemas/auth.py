"""Authentication schemas"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Login request schema"""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=100, description="User password")


class TokenResponse(BaseModel):
    """Token response schema"""

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Access token expiration time in seconds")


class RefreshRequest(BaseModel):
    """Refresh token request schema"""

    refresh_token: str = Field(..., description="JWT refresh token")


class RegisterRequest(BaseModel):
    """User registration request schema"""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=100, description="User password")


class UserResponse(BaseModel):
    """User response schema"""

    id: str = Field(..., description="User ID (UUIDv7)")
    email: str = Field(..., description="User email")
    is_active: bool = Field(..., description="Whether user account is active")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True  # Enable ORM mode for SQLAlchemy models
