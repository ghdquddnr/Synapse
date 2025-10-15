"""Pytest configuration and shared fixtures"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)


@pytest.fixture
def test_db():
    """Test database session (TODO: implement)"""
    # TODO: Create test database session
    # TODO: Setup tables
    yield
    # TODO: Cleanup


@pytest.fixture
def test_user():
    """Test user fixture (TODO: implement)"""
    # TODO: Create test user
    return {
        "id": "test-user-id",
        "email": "test@example.com",
    }
