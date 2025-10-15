"""
API tests for weekly report endpoints.
"""

from datetime import datetime, timedelta

import numpy as np
import pytest
from fastapi.testclient import TestClient


class TestReportsAPI:
    """Test cases for /reports endpoints."""

    def test_get_weekly_report_success(self, client: TestClient, test_user, test_db):
        """Test successful weekly report generation."""
        # Get current week
        now = datetime.utcnow()
        week_key = now.strftime("%Y-%W")

        # Create notes for current week with embeddings
        from app.models.note import Note

        for i in range(5):
            note = Note(
                id=f"note-{i}",
                user_id=test_user.id,
                body=f"Note {i} with some content about testing",
                embedding=np.random.rand(1024).astype(np.float32).tolist(),
                created_at=now - timedelta(days=i),
            )
            test_db.add(note)

        test_db.commit()

        # Login
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # Get weekly report
        response = client.get(
            f"/reports/weekly?week={week_key}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Check response structure
        assert data["week_key"] == week_key
        assert "report" in data
        assert "processing_time_ms" in data

        # Check report content
        report = data["report"]
        assert report["total_notes"] == 5
        assert "clusters" in report
        assert "top_keywords" in report
        assert "generated_at" in report

    def test_get_weekly_report_cached(self, client: TestClient, test_user, test_db):
        """Test that cached report is returned on second request."""
        # Get current week
        now = datetime.utcnow()
        week_key = now.strftime("%Y-%W")

        # Create notes
        from app.models.note import Note

        for i in range(3):
            note = Note(
                id=f"note-{i}",
                user_id=test_user.id,
                body=f"Note {i}",
                embedding=np.random.rand(1024).astype(np.float32).tolist(),
                created_at=now - timedelta(days=i),
            )
            test_db.add(note)

        test_db.commit()

        # Login
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # First request - generates report
        response1 = client.get(
            f"/reports/weekly?week={week_key}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response1.status_code == 200
        processing_time_1 = response1.json()["processing_time_ms"]

        # Second request - should return cached
        response2 = client.get(
            f"/reports/weekly?week={week_key}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response2.status_code == 200
        processing_time_2 = response2.json()["processing_time_ms"]

        # Cached response should have 0 processing time
        assert processing_time_2 == 0

    def test_get_weekly_report_regenerate(self, client: TestClient, test_user, test_db):
        """Test forced report regeneration."""
        # Get current week
        now = datetime.utcnow()
        week_key = now.strftime("%Y-%W")

        # Create notes
        from app.models.note import Note

        for i in range(3):
            note = Note(
                id=f"note-{i}",
                user_id=test_user.id,
                body=f"Note {i}",
                embedding=np.random.rand(1024).astype(np.float32).tolist(),
                created_at=now - timedelta(days=i),
            )
            test_db.add(note)

        test_db.commit()

        # Login
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # First request
        response1 = client.get(
            f"/reports/weekly?week={week_key}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response1.status_code == 200

        # Force regenerate
        response2 = client.get(
            f"/reports/weekly?week={week_key}&regenerate=true",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response2.status_code == 200

        # Should have processing time (not cached)
        assert response2.json()["processing_time_ms"] > 0

    def test_get_weekly_report_no_notes(self, client: TestClient, test_user, test_db):
        """Test 404 when no notes exist for the week."""
        # Use a week in the past with no notes
        week_key = "2020-01"

        # Login
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # Request report
        response = client.get(
            f"/reports/weekly?week={week_key}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404
        assert "No notes found" in response.json()["detail"]

    def test_get_weekly_report_invalid_week_format(
        self, client: TestClient, test_user, test_db
    ):
        """Test 422 validation error for invalid week format."""
        # Login
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # Invalid formats
        invalid_weeks = [
            "2024",  # Missing week
            "2024-W01",  # Wrong format
            "invalid",  # Completely wrong
            "2024-1",  # Single digit week
        ]

        for week in invalid_weeks:
            response = client.get(
                f"/reports/weekly?week={week}",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert response.status_code == 422  # Validation error

    def test_get_weekly_report_unauthorized(self, client: TestClient):
        """Test 401 error when not authenticated."""
        response = client.get("/reports/weekly?week=2024-01")
        assert response.status_code == 401

    def test_get_weekly_report_missing_week_parameter(
        self, client: TestClient, test_user, test_db
    ):
        """Test 422 error when week parameter is missing."""
        # Login
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # Missing week parameter
        response = client.get(
            "/reports/weekly",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 422  # Validation error

    def test_get_weekly_report_with_keywords(
        self, client: TestClient, test_user, test_db
    ):
        """Test report generation with keywords."""
        from app.models.keyword import Keyword
        from app.models.note import Note
        from app.models.note_keyword import NoteKeyword

        # Get current week
        now = datetime.utcnow()
        week_key = now.strftime("%Y-%W")

        # Create keywords
        kw1 = Keyword(name="Python")
        kw2 = Keyword(name="FastAPI")
        test_db.add_all([kw1, kw2])
        test_db.flush()

        # Create notes with keywords
        for i in range(3):
            note = Note(
                id=f"note-{i}",
                user_id=test_user.id,
                body=f"Note {i} about Python and FastAPI",
                embedding=np.random.rand(1024).astype(np.float32).tolist(),
                created_at=now - timedelta(days=i),
            )
            test_db.add(note)
            test_db.flush()

            # Add keywords
            test_db.add(NoteKeyword(note_id=note.id, keyword_id=kw1.id, score=0.9))
            test_db.add(NoteKeyword(note_id=note.id, keyword_id=kw2.id, score=0.8))

        test_db.commit()

        # Login
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # Get report
        response = client.get(
            f"/reports/weekly?week={week_key}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Should have keywords in report
        top_keywords = data["report"]["top_keywords"]
        assert len(top_keywords) > 0

    def test_get_weekly_report_different_users_isolated(
        self, client: TestClient, test_user, test_db
    ):
        """Test that reports are isolated per user."""
        from app.core.security import hash_password
        from app.models.note import Note
        from app.models.user import User

        # Create another user
        other_user = User(
            id="other-user",
            email="other@example.com",
            hashed_password=hash_password("other123"),
        )
        test_db.add(other_user)
        test_db.flush()

        # Get current week
        now = datetime.utcnow()
        week_key = now.strftime("%Y-%W")

        # Create notes for test_user
        for i in range(3):
            note = Note(
                id=f"test-note-{i}",
                user_id=test_user.id,
                body=f"Test user note {i}",
                embedding=np.random.rand(1024).astype(np.float32).tolist(),
                created_at=now - timedelta(days=i),
            )
            test_db.add(note)

        # Create notes for other_user
        for i in range(5):
            note = Note(
                id=f"other-note-{i}",
                user_id=other_user.id,
                body=f"Other user note {i}",
                embedding=np.random.rand(1024).astype(np.float32).tolist(),
                created_at=now - timedelta(days=i),
            )
            test_db.add(note)

        test_db.commit()

        # Login as test_user
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # Get report as test_user
        response = client.get(
            f"/reports/weekly?week={week_key}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Should only see test_user's notes (3 notes, not 5)
        assert data["report"]["total_notes"] == 3

    def test_get_weekly_report_excludes_deleted_notes(
        self, client: TestClient, test_user, test_db
    ):
        """Test that deleted notes are excluded from reports."""
        from app.models.note import Note

        # Get current week
        now = datetime.utcnow()
        week_key = now.strftime("%Y-%W")

        # Create active notes
        for i in range(3):
            note = Note(
                id=f"active-note-{i}",
                user_id=test_user.id,
                body=f"Active note {i}",
                embedding=np.random.rand(1024).astype(np.float32).tolist(),
                created_at=now - timedelta(days=i),
            )
            test_db.add(note)

        # Create deleted notes
        for i in range(2):
            note = Note(
                id=f"deleted-note-{i}",
                user_id=test_user.id,
                body=f"Deleted note {i}",
                embedding=np.random.rand(1024).astype(np.float32).tolist(),
                created_at=now - timedelta(days=i),
                deleted_at=now - timedelta(hours=1),
            )
            test_db.add(note)

        test_db.commit()

        # Login
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # Get report
        response = client.get(
            f"/reports/weekly?week={week_key}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Should only count active notes (3, not 5)
        assert data["report"]["total_notes"] == 3
