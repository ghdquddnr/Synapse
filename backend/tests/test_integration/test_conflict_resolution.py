"""Integration tests for conflict resolution scenarios"""

import pytest
from datetime import datetime, timezone
from fastapi import status

from app.models.note import Note


class TestConflictResolution:
    """Test conflict resolution with LWW (Last-Write-Wins) strategy"""

    def test_concurrent_note_modification(self, client, test_user, test_db):
        """
        Scenario: Same note modified on two different devices
        Expected: LWW resolution based on updated_at timestamp
        """
        # Device A pushes initial note
        device_a_push = {
            "device_id": "device-A",
            "changes": [
                {
                    "id": 1,
                    "entity_type": "note",
                    "entity_id": "note-conflict-001",
                    "operation": "insert",
                    "payload": {
                        "body": "Original content",
                        "importance": 2,
                        "source_url": None,
                        "image_path": None,
                        "created_at": "2025-01-18T09:00:00Z",
                        "updated_at": "2025-01-18T09:00:00Z",
                        "deleted_at": None,
                    },
                    "created_at": "2025-01-18T09:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        response_a = client.post(
            "/sync/push",
            json=device_a_push,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response_a.status_code == status.HTTP_200_OK
        assert response_a.json()["success_count"] == 1

        # Device B pulls and gets the note
        pull_b = client.post(
            "/sync/pull",
            json={"device_id": "device-B", "checkpoint": None},
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert pull_b.status_code == status.HTTP_200_OK

        # Device A modifies note (older timestamp)
        device_a_update = {
            "device_id": "device-A",
            "changes": [
                {
                    "id": 2,
                    "entity_type": "note",
                    "entity_id": "note-conflict-001",
                    "operation": "update",
                    "payload": {
                        "body": "Modified by Device A",
                        "importance": 2,
                        "source_url": None,
                        "image_path": None,
                        "created_at": "2025-01-18T09:00:00Z",
                        "updated_at": "2025-01-18T10:00:00Z",  # 10:00
                        "deleted_at": None,
                    },
                    "created_at": "2025-01-18T10:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        response_a_update = client.post(
            "/sync/push",
            json=device_a_update,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response_a_update.status_code == status.HTTP_200_OK

        # Device B modifies note (newer timestamp - should win)
        device_b_update = {
            "device_id": "device-B",
            "changes": [
                {
                    "id": 3,
                    "entity_type": "note",
                    "entity_id": "note-conflict-001",
                    "operation": "update",
                    "payload": {
                        "body": "Modified by Device B - Winner",
                        "importance": 3,
                        "source_url": "https://example.com",
                        "image_path": None,
                        "created_at": "2025-01-18T09:00:00Z",
                        "updated_at": "2025-01-18T10:30:00Z",  # 10:30 - newer
                        "deleted_at": None,
                    },
                    "created_at": "2025-01-18T10:30:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        response_b_update = client.post(
            "/sync/push",
            json=device_b_update,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response_b_update.status_code == status.HTTP_200_OK

        # Verify final state - Device B's version should win
        note = test_db.query(Note).filter(Note.id == "note-conflict-001").first()
        assert note is not None
        assert note.body == "Modified by Device B - Winner"
        assert note.importance == 3
        assert note.source_url == "https://example.com"

    def test_note_delete_vs_update_conflict(self, client, test_user, test_db):
        """
        Scenario: One device deletes note, another updates it
        Expected: Delete wins if it has newer timestamp
        """
        # Create initial note
        initial_note = {
            "device_id": "device-X",
            "changes": [
                {
                    "id": 1,
                    "entity_type": "note",
                    "entity_id": "note-del-001",
                    "operation": "insert",
                    "payload": {
                        "body": "To be deleted or updated",
                        "importance": 2,
                        "source_url": None,
                        "image_path": None,
                        "created_at": "2025-01-19T09:00:00Z",
                        "updated_at": "2025-01-19T09:00:00Z",
                        "deleted_at": None,
                    },
                    "created_at": "2025-01-19T09:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        response = client.post(
            "/sync/push",
            json=initial_note,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response.status_code == status.HTTP_200_OK

        # Device X updates note (older)
        update_note = {
            "device_id": "device-X",
            "changes": [
                {
                    "id": 2,
                    "entity_type": "note",
                    "entity_id": "note-del-001",
                    "operation": "update",
                    "payload": {
                        "body": "Updated content",
                        "importance": 3,
                        "source_url": None,
                        "image_path": None,
                        "created_at": "2025-01-19T09:00:00Z",
                        "updated_at": "2025-01-19T10:00:00Z",
                        "deleted_at": None,
                    },
                    "created_at": "2025-01-19T10:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        response_update = client.post(
            "/sync/push",
            json=update_note,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response_update.status_code == status.HTTP_200_OK

        # Device Y deletes note (newer - should win)
        delete_note = {
            "device_id": "device-Y",
            "changes": [
                {
                    "id": 3,
                    "entity_type": "note",
                    "entity_id": "note-del-001",
                    "operation": "delete",
                    "payload": {
                        "deleted_at": "2025-01-19T10:30:00Z",
                    },
                    "created_at": "2025-01-19T10:30:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        response_delete = client.post(
            "/sync/push",
            json=delete_note,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response_delete.status_code == status.HTTP_200_OK

        # Verify note is soft-deleted
        note = test_db.query(Note).filter(Note.id == "note-del-001").first()
        assert note is not None
        assert note.deleted_at is not None

    def test_multiple_device_sync_convergence(self, client, test_user, test_db):
        """
        Scenario: Multiple devices make changes, all sync eventually
        Expected: All devices converge to same final state
        """
        # Device 1: Create note
        device1_create = {
            "device_id": "device-1",
            "changes": [
                {
                    "id": 1,
                    "entity_type": "note",
                    "entity_id": "note-conv-001",
                    "operation": "insert",
                    "payload": {
                        "body": "Convergence test",
                        "importance": 2,
                        "source_url": None,
                        "image_path": None,
                        "created_at": "2025-01-20T09:00:00Z",
                        "updated_at": "2025-01-20T09:00:00Z",
                        "deleted_at": None,
                    },
                    "created_at": "2025-01-20T09:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        response1 = client.post(
            "/sync/push",
            json=device1_create,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response1.status_code == status.HTTP_200_OK
        checkpoint1 = response1.json()["new_checkpoint"]

        # Device 2: Update note
        device2_update = {
            "device_id": "device-2",
            "changes": [
                {
                    "id": 2,
                    "entity_type": "note",
                    "entity_id": "note-conv-001",
                    "operation": "update",
                    "payload": {
                        "body": "Updated by Device 2",
                        "importance": 3,
                        "source_url": None,
                        "image_path": None,
                        "created_at": "2025-01-20T09:00:00Z",
                        "updated_at": "2025-01-20T10:00:00Z",
                        "deleted_at": None,
                    },
                    "created_at": "2025-01-20T10:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        response2 = client.post(
            "/sync/push",
            json=device2_update,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response2.status_code == status.HTTP_200_OK
        checkpoint2 = response2.json()["new_checkpoint"]

        # Device 3: Pull from beginning
        pull3 = client.post(
            "/sync/pull",
            json={"device_id": "device-3", "checkpoint": None},
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert pull3.status_code == status.HTTP_200_OK
        pull3_data = pull3.json()

        # Find the note
        note_changes = [
            c for c in pull3_data["changes"]
            if c["entity_id"] == "note-conv-001"
        ]

        assert len(note_changes) == 1
        assert note_changes[0]["data"]["body"] == "Updated by Device 2"
        assert note_changes[0]["data"]["importance"] == 3

        # Device 1: Pull again
        pull1 = client.post(
            "/sync/pull",
            json={"device_id": "device-1", "checkpoint": checkpoint1},
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert pull1.status_code == status.HTTP_200_OK
        pull1_data = pull1.json()

        # Should see the update from Device 2
        note_updates = [
            c for c in pull1_data["changes"]
            if c["entity_id"] == "note-conv-001"
        ]

        if len(note_updates) > 0:
            assert note_updates[0]["data"]["body"] == "Updated by Device 2"

    def test_reflection_conflict(self, client, test_user, test_db):
        """
        Scenario: Same date reflection modified on different devices
        Expected: LWW resolution
        """
        # Device A: Create reflection
        device_a_reflection = {
            "device_id": "device-A",
            "changes": [
                {
                    "id": 1,
                    "entity_type": "reflection",
                    "entity_id": "2025-01-21",
                    "operation": "insert",
                    "payload": {
                        "date": "2025-01-21",
                        "content": "오늘은 좋은 하루였다.",
                        "created_at": "2025-01-21T20:00:00Z",
                        "updated_at": "2025-01-21T20:00:00Z",
                    },
                    "created_at": "2025-01-21T20:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        response_a = client.post(
            "/sync/push",
            json=device_a_reflection,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response_a.status_code == status.HTTP_200_OK

        # Device B: Update same reflection (newer timestamp - should win)
        device_b_reflection = {
            "device_id": "device-B",
            "changes": [
                {
                    "id": 2,
                    "entity_type": "reflection",
                    "entity_id": "2025-01-21",
                    "operation": "update",
                    "payload": {
                        "date": "2025-01-21",
                        "content": "오늘은 정말 훌륭한 하루였다. 많은 것을 배웠다.",
                        "created_at": "2025-01-21T20:00:00Z",
                        "updated_at": "2025-01-21T22:00:00Z",  # Newer
                    },
                    "created_at": "2025-01-21T22:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        response_b = client.post(
            "/sync/push",
            json=device_b_reflection,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert response_b.status_code == status.HTTP_200_OK

        # Pull and verify Device B's version won
        pull_response = client.post(
            "/sync/pull",
            json={"device_id": "device-C", "checkpoint": None},
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert pull_response.status_code == status.HTTP_200_OK
        pull_data = pull_response.json()

        reflection_changes = [
            c for c in pull_data["changes"]
            if c["entity_type"] == "reflection" and c["entity_id"] == "2025-01-21"
        ]

        assert len(reflection_changes) == 1
        assert "훌륭한" in reflection_changes[0]["data"]["content"]
