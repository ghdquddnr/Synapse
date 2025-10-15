"""Integration tests for sync Push → Pull → Recommendation flow"""

import pytest
from datetime import datetime, timezone
from fastapi import status

from app.models.note import Note
from app.models.relation import Relation


class TestSyncIntegrationFlow:
    """Test complete sync flow from Push to Pull to Recommendations"""

    def test_complete_sync_flow(self, client, test_user, test_db):
        """
        Test complete flow:
        1. Push note from client
        2. Pull note back to client
        3. Get AI recommendations
        """
        # Step 1: Push new note from client
        note_data = {
            "device_id": "device-123",
            "changes": [
                {
                    "id": 1,
                    "entity_type": "note",
                    "entity_id": "note-integration-001",
                    "operation": "insert",
                    "payload": {
                        "body": "머신러닝 기초 학습 완료. scikit-learn 라이브러리 사용법 익힘.",
                        "importance": 3,
                        "source_url": "https://scikit-learn.org",
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

        push_response = client.post(
            "/sync/push",
            json=note_data,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert push_response.status_code == status.HTTP_200_OK
        push_data = push_response.json()
        assert push_data["success_count"] == 1
        assert "new_checkpoint" in push_data

        checkpoint_after_push = push_data["new_checkpoint"]

        # Verify note exists in DB
        note = test_db.query(Note).filter(Note.id == "note-integration-001").first()
        assert note is not None
        assert note.body == "머신러닝 기초 학습 완료. scikit-learn 라이브러리 사용법 익힘."
        assert note.embedding is not None  # Embedding should be generated
        assert len(note.keywords) > 0  # Keywords should be extracted

        # Step 2: Pull changes back (simulate another device)
        pull_response = client.post(
            "/sync/pull",
            json={"device_id": "device-456", "checkpoint": None},
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert pull_response.status_code == status.HTTP_200_OK
        pull_data = pull_response.json()
        assert pull_data["total_changes"] >= 1

        # Find our note in pull response
        note_changes = [
            c for c in pull_data["changes"]
            if c["entity_type"] == "note" and c["entity_id"] == "note-integration-001"
        ]
        assert len(note_changes) == 1
        assert note_changes[0]["operation"] == "upsert"
        assert note_changes[0]["data"]["body"] == "머신러닝 기초 학습 완료. scikit-learn 라이브러리 사용법 익힘."

        # Step 3: Push another related note
        related_note_data = {
            "device_id": "device-123",
            "changes": [
                {
                    "id": 2,
                    "entity_type": "note",
                    "entity_id": "note-integration-002",
                    "operation": "insert",
                    "payload": {
                        "body": "딥러닝 프레임워크 비교: TensorFlow vs PyTorch. PyTorch가 더 pythonic함.",
                        "importance": 2,
                        "source_url": "https://pytorch.org",
                        "image_path": None,
                        "created_at": "2025-01-15T11:00:00Z",
                        "updated_at": "2025-01-15T11:00:00Z",
                        "deleted_at": None,
                    },
                    "created_at": "2025-01-15T11:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        push_response2 = client.post(
            "/sync/push",
            json=related_note_data,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert push_response2.status_code == status.HTTP_200_OK

        # Step 4: Get AI recommendations for first note
        # (Note: This may not return results if embeddings are not similar enough)
        recommend_response = client.get(
            f"/recommend/note-integration-001?k=5",
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert recommend_response.status_code == status.HTTP_200_OK
        recommend_data = recommend_response.json()
        assert "recommendations" in recommend_data
        assert "total_count" in recommend_data

        # If there are recommendations, verify structure
        if recommend_data["total_count"] > 0:
            rec = recommend_data["recommendations"][0]
            assert "note_id" in rec
            assert "similarity_score" in rec
            assert "reason" in rec
            assert 0 <= rec["similarity_score"] <= 1

    def test_sync_with_relations(self, client, test_user, test_db):
        """Test sync flow with note relations"""
        # Push two notes
        notes_data = {
            "device_id": "device-789",
            "changes": [
                {
                    "id": 1,
                    "entity_type": "note",
                    "entity_id": "note-rel-001",
                    "operation": "insert",
                    "payload": {
                        "body": "프로젝트 기획안 작성",
                        "importance": 3,
                        "source_url": None,
                        "image_path": None,
                        "created_at": "2025-01-16T09:00:00Z",
                        "updated_at": "2025-01-16T09:00:00Z",
                        "deleted_at": None,
                    },
                    "created_at": "2025-01-16T09:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                },
                {
                    "id": 2,
                    "entity_type": "note",
                    "entity_id": "note-rel-002",
                    "operation": "insert",
                    "payload": {
                        "body": "기획안 발표 자료 준비",
                        "importance": 2,
                        "source_url": None,
                        "image_path": None,
                        "created_at": "2025-01-16T10:00:00Z",
                        "updated_at": "2025-01-16T10:00:00Z",
                        "deleted_at": None,
                    },
                    "created_at": "2025-01-16T10:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                },
            ],
        }

        push_response = client.post(
            "/sync/push",
            json=notes_data,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert push_response.status_code == status.HTTP_200_OK
        assert push_response.json()["success_count"] == 2

        # Push relation
        relation_data = {
            "device_id": "device-789",
            "changes": [
                {
                    "id": 3,
                    "entity_type": "relation",
                    "entity_id": "rel-001",
                    "operation": "insert",
                    "payload": {
                        "from_note_id": "note-rel-001",
                        "to_note_id": "note-rel-002",
                        "relation_type": "related",
                        "created_at": "2025-01-16T10:30:00Z",
                    },
                    "created_at": "2025-01-16T10:30:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        push_relation_response = client.post(
            "/sync/push",
            json=relation_data,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert push_relation_response.status_code == status.HTTP_200_OK
        assert push_relation_response.json()["success_count"] == 1

        # Verify relation exists
        relation = test_db.query(Relation).filter(Relation.id == "rel-001").first()
        assert relation is not None
        assert relation.from_note_id == "note-rel-001"
        assert relation.to_note_id == "note-rel-002"

        # Pull and verify all changes
        pull_response = client.post(
            "/sync/pull",
            json={"device_id": "device-999", "checkpoint": None},
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert pull_response.status_code == status.HTTP_200_OK
        pull_data = pull_response.json()

        # Should have at least 2 notes + 1 relation
        note_changes = [c for c in pull_data["changes"] if c["entity_type"] == "note"]
        relation_changes = [c for c in pull_data["changes"] if c["entity_type"] == "relation"]

        assert len(note_changes) >= 2
        assert len(relation_changes) >= 1

    def test_incremental_sync(self, client, test_user, test_db):
        """Test incremental sync with checkpoint"""
        # Initial push
        initial_note = {
            "device_id": "device-incr",
            "changes": [
                {
                    "id": 1,
                    "entity_type": "note",
                    "entity_id": "note-incr-001",
                    "operation": "insert",
                    "payload": {
                        "body": "첫 번째 노트",
                        "importance": 2,
                        "source_url": None,
                        "image_path": None,
                        "created_at": "2025-01-17T09:00:00Z",
                        "updated_at": "2025-01-17T09:00:00Z",
                        "deleted_at": None,
                    },
                    "created_at": "2025-01-17T09:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        push_response1 = client.post(
            "/sync/push",
            json=initial_note,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert push_response1.status_code == status.HTTP_200_OK
        checkpoint1 = push_response1.json()["new_checkpoint"]

        # Pull with checkpoint
        pull_response1 = client.post(
            "/sync/pull",
            json={"device_id": "device-incr", "checkpoint": checkpoint1},
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert pull_response1.status_code == status.HTTP_200_OK
        # Should have no changes (already synced)
        assert pull_response1.json()["total_changes"] == 0

        # Push another note
        second_note = {
            "device_id": "device-incr",
            "changes": [
                {
                    "id": 2,
                    "entity_type": "note",
                    "entity_id": "note-incr-002",
                    "operation": "insert",
                    "payload": {
                        "body": "두 번째 노트",
                        "importance": 3,
                        "source_url": None,
                        "image_path": None,
                        "created_at": "2025-01-17T10:00:00Z",
                        "updated_at": "2025-01-17T10:00:00Z",
                        "deleted_at": None,
                    },
                    "created_at": "2025-01-17T10:00:00Z",
                    "synced_at": None,
                    "retry_count": 0,
                    "last_error": None,
                }
            ],
        }

        push_response2 = client.post(
            "/sync/push",
            json=second_note,
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert push_response2.status_code == status.HTTP_200_OK

        # Pull again with old checkpoint
        pull_response2 = client.post(
            "/sync/pull",
            json={"device_id": "device-incr", "checkpoint": checkpoint1},
            headers={"Authorization": f"Bearer {test_user['access_token']}"},
        )

        assert pull_response2.status_code == status.HTTP_200_OK
        # Should only have the second note
        pull_data2 = pull_response2.json()
        assert pull_data2["total_changes"] >= 1

        new_note_changes = [
            c for c in pull_data2["changes"]
            if c["entity_id"] == "note-incr-002"
        ]
        assert len(new_note_changes) == 1
