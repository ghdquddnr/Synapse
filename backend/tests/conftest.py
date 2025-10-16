"""Pytest configuration and shared fixtures"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.core.security import hash_password
from passlib.context import CryptContext


# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Test-only password context with simpler bcrypt rounds to avoid bcrypt bugs
# Use 2b ident to avoid bcrypt wrap bug detection issues
test_pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=4,
    bcrypt__default_ident="2b",
)


@pytest.fixture
def db():
    """Test database session"""
    # For SQLite testing, we need to create only User table
    # as Note, WeeklyReport have PostgreSQL-specific types (Vector, JSONB)
    from app.models.user import User as UserModel

    # Create only user table for auth tests
    UserModel.__table__.create(bind=engine, checkfirst=True)

    # Create session
    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        # Drop tables after test
        UserModel.__table__.drop(bind=engine, checkfirst=True)


@pytest.fixture
def client(db):
    """FastAPI test client with test database"""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def test_db():
    """Full test database with all tables (for integration tests)"""
    # Create all tables
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def skip_password_hash(request, monkeypatch):
    """
    Auto-applied fixture to bypass bcrypt hashing in tests.

    bcrypt has environment-specific issues in Windows test environments,
    particularly with the wrap bug detection. This fixture replaces
    hash_password and verify_password with simple mock implementations.

    Skip this fixture for test_security.py to allow actual bcrypt testing.
    """
    # Skip for security tests
    if "test_security" in request.node.fspath.basename:
        return

    from app.core import security

    def mock_hash_password(password: str) -> str:
        """Mock hash that just prefixes password"""
        return f"hashed_{password}"

    def mock_verify_password(plain: str, hashed: str) -> bool:
        """Mock verify that checks prefix"""
        return hashed == f"hashed_{plain}"

    monkeypatch.setattr(security, "hash_password", mock_hash_password)
    monkeypatch.setattr(security, "verify_password", mock_verify_password)


@pytest.fixture
def test_user(db, client):
    """Test user fixture with access token"""
    # Use simple password - hashing is mocked by skip_password_hash
    test_password = "test1234"

    # hash_password is mocked to return "hashed_{password}"
    from app.core.security import hash_password
    hashed = hash_password(test_password)

    user = User(
        id="01234567-89ab-cdef-0123-456789abcdef",
        email="test@example.com",
        hashed_password=hashed,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Login to get access token
    response = client.post(
        "/auth/login",
        json={
            "email": "test@example.com",
            "password": test_password,
        },
    )

    # Return dict with user info and token
    return {
        "id": user.id,
        "email": user.email,
        "password": test_password,
        "user_obj": user,
        "access_token": response.json()["access_token"] if response.status_code == 200 else None,
    }
