"""Tests for sync API endpoints"""

import pytest
from datetime import datetime, timezone
from fastapi import status

from app.models.note import Note
from app.models.relation import Relation
from app.models.reflection import Reflection


class TestPushSync:
    """Tests for POST /sync/push endpoint"""

    def test_push_note_insert_success(self, client, test_user):
        """Test successful push of new note"""
        note_data = {
            "device_id": "device-123",
            "changes": [
                {
                    "id": 1,
                    "entity_type": "note",
                    "entity_id": "note-001",
                    "operation": "insert",
                    "payload": {
                        "body": "Test note content",
                        "importance": 2,
                        "source_url": None,
                        "image_path": None,
                        "created_at": "2025-01-15T10:00:00Z",
                        "updated_at": "2025-01-15T10:00:00Z",
                        "deleted_at": None,
                    },
                    "created_at": "2025-01-15T10:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        response = client.post(
            "/sync/push",
            json=note_data,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["success_count"] == 1
        assert data["failure_count"] == 0
        assert len(data["results"]) == 1
        assert data["results"][0]["entity_id"] == "note-001"
        assert data["results"][0]["success"] is True
        assert "new_checkpoint" in data

    def test_push_note_update_success(self, client, test_user, test_db):
        """Test successful push of updated note"""
        # Create existing note
        note = Note(
            id="note-001",
            user_id=test_user["id"],
            body="Original content",
            importance=2,
            created_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
        )
        test_db.add(note)
        test_db.commit()

        # Push update
        note_data = {
            "device_id": "device-123",
            "changes": [
                {
                    "id": 1,
                    "entity_type": "note",
                    "entity_id": "note-001",
                    "operation": "update",
                    "payload": {
                        "body": "Updated content",
                        "importance": 3,
                        "source_url": None,
                        "image_path": None,
                        "created_at": "2025-01-15T09:00:00Z",
                        "updated_at": "2025-01-15T10:00:00Z",
                        "deleted_at": None,
                    },
                    "created_at": "2025-01-15T10:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        response = client.post(
            "/sync/push",
            json=note_data,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["success_count"] == 1
        assert data["failure_count"] == 0

        # Verify update in DB
        test_db.refresh(note)
        assert note.body == "Updated content"
        assert note.importance == 3

    def test_push_note_delete_success(self, client, test_user, test_db):
        """Test successful push of note deletion"""
        # Create existing note
        note = Note(
            id="note-001",
            user_id=test_user["id"],
            body="To be deleted",
            importance=2,
            created_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
        )
        test_db.add(note)
        test_db.commit()

        # Push delete
        note_data = {
            "device_id": "device-123",
            "changes": [
                {
                    "id": 1,
                    "entity_type": "note",
                    "entity_id": "note-001",
                    "operation": "delete",
                    "payload": {
                        "deleted_at": "2025-01-15T10:00:00Z",
                    },
                    "created_at": "2025-01-15T10:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        response = client.post(
            "/sync/push",
            json=note_data,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["success_count"] == 1

        # Verify soft delete in DB
        test_db.refresh(note)
        assert note.deleted_at is not None

    def test_push_relation_insert_success(self, client, test_user, test_db):
        """Test successful push of new relation"""
        # Create notes first
        note1 = Note(
            id="note-001",
            user_id=test_user["id"],
            body="Note 1",
            importance=2,
            created_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
        )
        note2 = Note(
            id="note-002",
            user_id=test_user["id"],
            body="Note 2",
            importance=2,
            created_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
        )
        test_db.add(note1)
        test_db.add(note2)
        test_db.commit()

        # Push relation
        relation_data = {
            "device_id": "device-123",
            "changes": [
                {
                    "id": 1,
                    "entity_type": "relation",
                    "entity_id": "relation-001",
                    "operation": "insert",
                    "payload": {
                        "from_note_id": "note-001",
                        "to_note_id": "note-002",
                        "relation_type": "reference",
                        "created_at": "2025-01-15T10:00:00Z",
                    },
                    "created_at": "2025-01-15T10:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        response = client.post(
            "/sync/push",
            json=relation_data,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["success_count"] == 1

        # Verify in DB
        relation = test_db.query(Relation).filter(Relation.id == "relation-001").first()
        assert relation is not None
        assert relation.from_note_id == "note-001"
        assert relation.to_note_id == "note-002"

    def test_push_reflection_insert_success(self, client, test_user):
        """Test successful push of new reflection"""
        reflection_data = {
            "device_id": "device-123",
            "changes": [
                {
                    "id": 1,
                    "entity_type": "reflection",
                    "entity_id": "2025-01-15",
                    "operation": "insert",
                    "payload": {
                        "date": "2025-01-15",
                        "content": "Today's reflection",
                        "created_at": "2025-01-15T10:00:00Z",
                        "updated_at": "2025-01-15T10:00:00Z",
                    },
                    "created_at": "2025-01-15T10:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        response = client.post(
            "/sync/push",
            json=reflection_data,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["success_count"] == 1

    def test_push_multiple_changes_success(self, client, test_user, test_db):
        """Test successful push of multiple changes in one batch"""
        # Create note for relation
        note1 = Note(
            id="note-001",
            user_id=test_user["id"],
            body="Note 1",
            importance=2,
            created_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
        )
        test_db.add(note1)
        test_db.commit()

        # Push multiple changes
        changes_data = {
            "device_id": "device-123",
            "changes": [
                {
                    "id": 1,
                    "entity_type": "note",
                    "entity_id": "note-002",
                    "operation": "insert",
                    "payload": {
                        "body": "New note",
                        "importance": 2,
                        "source_url": None,
                        "image_path": None,
                        "created_at": "2025-01-15T10:00:00Z",
                        "updated_at": "2025-01-15T10:00:00Z",
                        "deleted_at": None,
                    },
                    "created_at": "2025-01-15T10:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                },
                {
                    "id": 2,
                    "entity_type": "reflection",
                    "entity_id": "2025-01-15",
                    "operation": "insert",
                    "payload": {
                        "date": "2025-01-15",
                        "content": "Daily reflection",
                        "created_at": "2025-01-15T10:00:00Z",
                        "updated_at": "2025-01-15T10:00:00Z",
                    },
                    "created_at": "2025-01-15T10:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                },
            ],
        }

        response = client.post(
            "/sync/push",
            json=changes_data,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["success_count"] == 2
        assert data["failure_count"] == 0
        assert len(data["results"]) == 2

    def test_push_without_auth(self, client):
        """Test push without authentication"""
        response = client.post("/sync/push", json={"device_id": "device-123", "changes": []})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_push_missing_required_field(self, client, test_user):
        """Test push with missing required field in payload"""
        note_data = {
            "device_id": "device-123",
            "changes": [
                {
                    "id": 1,
                    "entity_type": "note",
                    "entity_id": "note-001",
                    "operation": "insert",
                    "payload": {
                        # Missing body field
                        "importance": 2,
                        "created_at": "2025-01-15T10:00:00Z",
                        "updated_at": "2025-01-15T10:00:00Z",
                    },
                    "created_at": "2025-01-15T10:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        response = client.post(
            "/sync/push",
            json=note_data,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["success_count"] == 0
        assert data["failure_count"] == 1
        assert data["results"][0]["success"] is False
        assert "body" in data["results"][0]["error"]


class TestPullSync:
    """Tests for POST /sync/pull endpoint"""

    def test_pull_initial_sync(self, client, test_user, test_db):
        """Test initial pull sync without checkpoint"""
        # Create some notes
        note1 = Note(
            id="note-001",
            user_id=test_user["id"],
            body="Note 1",
            importance=2,
            created_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
        )
        note2 = Note(
            id="note-002",
            user_id=test_user["id"],
            body="Note 2",
            importance=3,
            created_at=datetime(2025, 1, 15, 9, 30, 0, tzinfo=timezone.utc),
            updated_at=datetime(2025, 1, 15, 9, 30, 0, tzinfo=timezone.utc),
        )
        test_db.add(note1)
        test_db.add(note2)
        test_db.commit()

        # Pull without checkpoint
        response = client.post(
            "/sync/pull",
            json={"device_id": "device-123", "checkpoint": None},
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["total_changes"] >= 2
        assert "new_checkpoint" in data
        assert isinstance(data["has_more"], bool)

        # Verify note changes
        note_changes = [c for c in data["changes"] if c["entity_type"] == "note"]
        assert len(note_changes) >= 2

    def test_pull_incremental_sync(self, client, test_user, test_db):
        """Test incremental pull sync with checkpoint"""
        # Create initial note
        note1 = Note(
            id="note-001",
            user_id=test_user["id"],
            body="Old note",
            importance=2,
            created_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
        )
        test_db.add(note1)
        test_db.commit()

        # Checkpoint after initial sync
        checkpoint = "2025-01-15T09:00:00Z"

        # Create new note after checkpoint
        note2 = Note(
            id="note-002",
            user_id=test_user["id"],
            body="New note",
            importance=3,
            created_at=datetime(2025, 1, 15, 10, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2025, 1, 15, 10, 0, 0, tzinfo=timezone.utc),
        )
        test_db.add(note2)
        test_db.commit()

        # Pull with checkpoint
        response = client.post(
            "/sync/pull",
            json={"device_id": "device-123", "checkpoint": checkpoint},
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        # Should only return note-002 (created after checkpoint)
        assert data["total_changes"] >= 1

    def test_pull_deleted_note(self, client, test_user, test_db):
        """Test pull sync returns delete operation for deleted notes"""
        # Create and delete a note
        note = Note(
            id="note-001",
            user_id=test_user["id"],
            body="To be deleted",
            importance=2,
            created_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
            deleted_at=datetime(2025, 1, 15, 10, 0, 0, tzinfo=timezone.utc),
        )
        test_db.add(note)
        test_db.commit()

        # Pull
        response = client.post(
            "/sync/pull",
            json={"device_id": "device-123", "checkpoint": None},
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        note_changes = [c for c in data["changes"] if c["entity_id"] == "note-001"]

        assert len(note_changes) == 1
        assert note_changes[0]["operation"] == "delete"
        assert note_changes[0]["data"] is None

    def test_pull_without_auth(self, client):
        """Test pull without authentication"""
        response = client.post("/sync/pull", json={"device_id": "device-123", "checkpoint": None})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_pull_empty_result(self, client, test_user):
        """Test pull when no changes exist"""
        # Pull with future checkpoint (no changes after this time)
        response = client.post(
            "/sync/pull",
            json={"device_id": "device-123", "checkpoint": "2099-01-01T00:00:00Z"},
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["total_changes"] == 0
        assert len(data["changes"]) == 0
        assert data["has_more"] is False

    def test_pull_user_isolation(self, client, test_user, test_db):
        """Test pull only returns user's own data"""
        # Create note for test_user
        note1 = Note(
            id="note-001",
            user_id=test_user["id"],
            body="My note",
            importance=2,
            created_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
        )

        # Create note for another user
        from app.models.user import User
        from app.core.security import hash_password

        other_user = User(
            id="other-user-id",
            email="other@example.com",
            hashed_password=hash_password("testpass123"),
        )
        note2 = Note(
            id="note-002",
            user_id="other-user-id",
            body="Other user's note",
            importance=2,
            created_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2025, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
        )

        test_db.add(other_user)
        test_db.add(note1)
        test_db.add(note2)
        test_db.commit()

        # Pull as test_user
        response = client.post(
            "/sync/pull",
            json={"device_id": "device-123", "checkpoint": None},
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        note_ids = [c["entity_id"] for c in data["changes"] if c["entity_type"] == "note"]

        # Should only see own note
        assert "note-001" in note_ids
        assert "note-002" not in note_ids
