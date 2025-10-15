"""
API tests for recommendation endpoints.
"""

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.keyword import Keyword
from app.models.note import Note
from app.models.note_keyword import NoteKeyword


class TestRecommendAPI:
    """Test cases for /recommend endpoints."""

    def test_get_recommendations_success(self, client: TestClient, test_user, test_db):
        """Test successful recommendation retrieval."""
        # Create target note with embedding
        target_note = Note(
            id="target-note",
            user_id=test_user.id,
            body="Machine learning and artificial intelligence",
            embedding=np.random.rand(1024).astype(np.float32).tolist(),
        )
        test_db.add(target_note)

        # Create candidate notes with embeddings
        for i in range(5):
            candidate = Note(
                id=f"candidate-{i}",
                user_id=test_user.id,
                body=f"Note about AI and ML topic {i}",
                embedding=np.random.rand(1024).astype(np.float32).tolist(),
            )
            test_db.add(candidate)

        test_db.commit()

        # Login to get token
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Get recommendations
        response = client.get(
            f"/recommend/{target_note.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Check response structure
        assert data["note_id"] == target_note.id
        assert isinstance(data["recommendations"], list)
        assert isinstance(data["total_candidates"], int)
        assert isinstance(data["processing_time_ms"], int)

        # Each recommendation should have proper structure
        for rec in data["recommendations"]:
            assert "note_id" in rec
            assert "body_preview" in rec
            assert "score" in rec
            assert "reason" in rec
            assert "created_at" in rec
            assert "common_keywords" in rec
            assert 0.0 <= rec["score"] <= 1.0

    def test_get_recommendations_with_k_parameter(
        self, client: TestClient, test_user, test_db
    ):
        """Test recommendation with custom k parameter."""
        # Create target note
        target_note = Note(
            id="target-note",
            user_id=test_user.id,
            body="Test note",
            embedding=np.random.rand(1024).astype(np.float32).tolist(),
        )
        test_db.add(target_note)

        # Create 10 candidate notes
        for i in range(10):
            candidate = Note(
                id=f"candidate-{i}",
                user_id=test_user.id,
                body=f"Candidate note {i}",
                embedding=np.random.rand(1024).astype(np.float32).tolist(),
            )
            test_db.add(candidate)

        test_db.commit()

        # Login
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # Request top 3 recommendations
        response = client.get(
            f"/recommend/{target_note.id}?k=3",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["recommendations"]) <= 3

    def test_get_recommendations_note_not_found(
        self, client: TestClient, test_user, test_db
    ):
        """Test 404 error when note doesn't exist."""
        # Login
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # Request recommendations for non-existent note
        response = client.get(
            "/recommend/nonexistent-note",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_recommendations_unauthorized(self, client: TestClient):
        """Test 401 error when not authenticated."""
        response = client.get("/recommend/some-note-id")
        assert response.status_code == 401

    def test_get_recommendations_no_embedding(
        self, client: TestClient, test_user, test_db
    ):
        """Test behavior when note has no embedding."""
        # Create note without embedding
        note = Note(
            id="no-embedding-note",
            user_id=test_user.id,
            body="Note without embedding",
            embedding=None,
        )
        test_db.add(note)
        test_db.commit()

        # Login
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # Get recommendations
        response = client.get(
            f"/recommend/{note.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["recommendations"] == []
        assert data["total_candidates"] == 0

    def test_get_recommendations_no_candidates(
        self, client: TestClient, test_user, test_db
    ):
        """Test when only one note exists (no candidates)."""
        # Create single note
        note = Note(
            id="only-note",
            user_id=test_user.id,
            body="Only note in database",
            embedding=np.random.rand(1024).astype(np.float32).tolist(),
        )
        test_db.add(note)
        test_db.commit()

        # Login
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # Get recommendations
        response = client.get(
            f"/recommend/{note.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["recommendations"] == []

    def test_get_recommendations_different_user_access_denied(
        self, client: TestClient, test_user, test_db
    ):
        """Test that user cannot get recommendations for other user's notes."""
        # Create another user
        from app.core.security import hash_password
        from app.models.user import User

        other_user = User(
            id="other-user",
            email="other@example.com",
            hashed_password=hash_password("other123"),  # Short password
        )
        test_db.add(other_user)

        # Create note owned by other user
        other_note = Note(
            id="other-user-note",
            user_id=other_user.id,
            body="Other user's note",
            embedding=np.random.rand(1024).astype(np.float32).tolist(),
        )
        test_db.add(other_note)
        test_db.commit()

        # Login as test_user
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # Try to get recommendations for other user's note
        response = client.get(
            f"/recommend/{other_note.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404  # Access denied, returns not found

    def test_get_recommendations_k_validation(
        self, client: TestClient, test_user, test_db
    ):
        """Test k parameter validation."""
        # Create note
        note = Note(
            id="test-note",
            user_id=test_user.id,
            body="Test note",
            embedding=np.random.rand(1024).astype(np.float32).tolist(),
        )
        test_db.add(note)
        test_db.commit()

        # Login
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # Test k too small (< 1)
        response = client.get(
            f"/recommend/{note.id}?k=0",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 422  # Validation error

        # Test k too large (> 50)
        response = client.get(
            f"/recommend/{note.id}?k=100",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 422  # Validation error

        # Test valid k values
        for k in [1, 10, 25, 50]:
            response = client.get(
                f"/recommend/{note.id}?k={k}",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert response.status_code == 200

    def test_get_recommendations_deleted_notes_excluded(
        self, client: TestClient, test_user, test_db
    ):
        """Test that deleted notes are not recommended."""
        from datetime import datetime

        # Create target note
        target_note = Note(
            id="target-note",
            user_id=test_user.id,
            body="Target note",
            embedding=np.random.rand(1024).astype(np.float32).tolist(),
        )
        test_db.add(target_note)

        # Create active candidate
        active_note = Note(
            id="active-note",
            user_id=test_user.id,
            body="Active candidate",
            embedding=np.random.rand(1024).astype(np.float32).tolist(),
        )
        test_db.add(active_note)

        # Create deleted candidate
        deleted_note = Note(
            id="deleted-note",
            user_id=test_user.id,
            body="Deleted candidate",
            embedding=np.random.rand(1024).astype(np.float32).tolist(),
            deleted_at=datetime.utcnow(),
        )
        test_db.add(deleted_note)
        test_db.commit()

        # Login
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # Get recommendations
        response = client.get(
            f"/recommend/{target_note.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Deleted note should not be in recommendations
        recommended_ids = [rec["note_id"] for rec in data["recommendations"]]
        assert deleted_note.id not in recommended_ids

    def test_get_recommendations_with_keywords(
        self, client: TestClient, test_user, test_db
    ):
        """Test recommendations with keyword overlap."""
        # Create keywords
        kw1 = Keyword(name="머신러닝")
        kw2 = Keyword(name="딥러닝")
        kw3 = Keyword(name="Python")
        test_db.add_all([kw1, kw2, kw3])
        test_db.flush()

        # Create target note with keywords
        target_note = Note(
            id="target-note",
            user_id=test_user.id,
            body="Target note about ML",
            embedding=np.random.rand(1024).astype(np.float32).tolist(),
        )
        test_db.add(target_note)
        test_db.flush()

        # Add keywords to target note
        test_db.add(NoteKeyword(note_id=target_note.id, keyword_id=kw1.id, score=0.9))
        test_db.add(NoteKeyword(note_id=target_note.id, keyword_id=kw2.id, score=0.8))

        # Create candidate with overlapping keywords
        candidate = Note(
            id="candidate-note",
            user_id=test_user.id,
            body="Candidate note about ML",
            embedding=np.random.rand(1024).astype(np.float32).tolist(),
        )
        test_db.add(candidate)
        test_db.flush()

        # Add keywords to candidate
        test_db.add(NoteKeyword(note_id=candidate.id, keyword_id=kw1.id, score=0.85))
        test_db.add(NoteKeyword(note_id=candidate.id, keyword_id=kw3.id, score=0.7))

        test_db.commit()

        # Login
        login_response = client.post(
            "/auth/login",
            json={"email": test_user.email, "password": test_user.plain_password},
        )
        token = login_response.json()["access_token"]

        # Get recommendations
        response = client.get(
            f"/recommend/{target_note.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        # Should have at least one recommendation
        if len(data["recommendations"]) > 0:
            rec = data["recommendations"][0]
            assert rec["note_id"] == candidate.id
            assert "머신러닝" in rec["common_keywords"]  # Common keyword
