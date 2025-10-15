"""Sync API endpoints for push/pull synchronization"""

import time
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.core.deps import get_current_user, get_db
from app.core.logging import get_logger
from app.core.exceptions import ValidationError, DatabaseError, SyncError
from app.models.user import User
from app.models.note import Note
from app.models.keyword import Keyword
from app.models.note_keyword import NoteKeyword
from app.models.relation import Relation
from app.models.reflection import Reflection
from app.schemas.sync import (
    SyncPushRequest,
    SyncPushResponse,
    SyncPushItemResult,
    SyncPullRequest,
    SyncPullResponse,
    Delta,
)
from app.services.embedding import get_embedding_service
from app.services.keyword import get_keyword_service

logger = get_logger(__name__)
router = APIRouter(prefix="/sync", tags=["sync"])


def generate_checkpoint() -> str:
    """
    Generate a checkpoint string for sync tracking.

    Uses ISO 8601 timestamp with microseconds for precision.

    Returns:
        Checkpoint string (ISO 8601 datetime)
    """
    return datetime.now(timezone.utc).isoformat()


def process_note_insert(
    db: Session,
    user_id: str,
    entity_id: str,
    payload: Dict[str, Any]
) -> None:
    """
    Process note insert operation.

    Args:
        db: Database session
        user_id: User ID
        entity_id: Note ID
        payload: Note data

    Raises:
        ValidationException: If payload is invalid
        DatabaseException: If database operation fails
    """
    # Validate required fields
    required_fields = ["body", "importance", "created_at", "updated_at"]
    for field in required_fields:
        if field not in payload:
            raise ValidationError(f"Missing required field: {field}")

    # Check if note already exists (conflict)
    existing = db.query(Note).filter(Note.id == entity_id).first()
    if existing:
        # LWW: Compare timestamps
        existing_updated = existing.updated_at
        new_updated = datetime.fromisoformat(payload["updated_at"].replace("Z", "+00:00"))

        if new_updated <= existing_updated:
            logger.debug(f"Skipping insert for {entity_id}: local is newer")
            return

    # Generate embedding
    embedding_service = get_embedding_service()
    try:
        embedding = embedding_service.generate_embedding(payload["body"])
    except Exception as e:
        logger.error(f"Failed to generate embedding for note {entity_id}: {e}")
        embedding = None

    # Extract keywords
    keyword_service = get_keyword_service()
    keywords = keyword_service.extract_keyword_names(payload["body"], top_k=5)

    # Create or update note
    if existing:
        # Update existing
        existing.body = payload["body"]
        existing.importance = payload["importance"]
        existing.source_url = payload.get("source_url")
        existing.image_path = payload.get("image_path")
        existing.embedding = embedding.tolist() if embedding is not None else None
        existing.updated_at = new_updated
        existing.deleted_at = None if not payload.get("deleted_at") else datetime.fromisoformat(payload["deleted_at"].replace("Z", "+00:00"))
        note = existing
    else:
        # Insert new
        note = Note(
            id=entity_id,
            user_id=user_id,
            body=payload["body"],
            importance=payload["importance"],
            source_url=payload.get("source_url"),
            image_path=payload.get("image_path"),
            embedding=embedding.tolist() if embedding is not None else None,
            created_at=datetime.fromisoformat(payload["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(payload["updated_at"].replace("Z", "+00:00")),
            deleted_at=None if not payload.get("deleted_at") else datetime.fromisoformat(payload["deleted_at"].replace("Z", "+00:00")),
        )
        db.add(note)

    db.flush()

    # Update keywords
    # Delete existing keyword associations
    db.query(NoteKeyword).filter(NoteKeyword.note_id == entity_id).delete()

    # Insert new keyword associations
    for keyword_name in keywords:
        # Get or create keyword
        keyword = db.query(Keyword).filter(Keyword.name == keyword_name).first()
        if not keyword:
            keyword = Keyword(name=keyword_name)
            db.add(keyword)
            db.flush()

        # Create association
        note_keyword = NoteKeyword(note_id=entity_id, keyword_id=keyword.id)
        db.add(note_keyword)

    logger.debug(f"Processed note insert: {entity_id}, keywords: {keywords}")


def process_note_update(
    db: Session,
    user_id: str,
    entity_id: str,
    payload: Dict[str, Any]
) -> None:
    """
    Process note update operation.

    Same as insert for notes (upsert logic).

    Args:
        db: Database session
        user_id: User ID
        entity_id: Note ID
        payload: Note data
    """
    process_note_insert(db, user_id, entity_id, payload)


def process_note_delete(
    db: Session,
    user_id: str,
    entity_id: str,
    payload: Dict[str, Any]
) -> None:
    """
    Process note delete operation.

    Soft delete: Set deleted_at timestamp.

    Args:
        db: Database session
        user_id: User ID
        entity_id: Note ID
        payload: Note data (may contain deleted_at)
    """
    note = db.query(Note).filter(Note.id == entity_id, Note.user_id == user_id).first()
    if not note:
        logger.debug(f"Note {entity_id} not found for delete")
        return

    # Soft delete
    deleted_at = payload.get("deleted_at")
    if deleted_at:
        note.deleted_at = datetime.fromisoformat(deleted_at.replace("Z", "+00:00"))
    else:
        note.deleted_at = datetime.now(timezone.utc)

    note.server_timestamp = datetime.now(timezone.utc)
    logger.debug(f"Soft deleted note: {entity_id}")


def process_relation_insert(
    db: Session,
    user_id: str,
    entity_id: str,
    payload: Dict[str, Any]
) -> None:
    """
    Process relation insert operation.

    Args:
        db: Database session
        user_id: User ID
        entity_id: Relation ID
        payload: Relation data
    """
    required_fields = ["from_note_id", "to_note_id", "relation_type", "created_at"]
    for field in required_fields:
        if field not in payload:
            raise ValidationError(f"Missing required field: {field}")

    # Check if relation already exists
    existing = db.query(Relation).filter(Relation.id == entity_id).first()
    if existing:
        logger.debug(f"Relation {entity_id} already exists, skipping")
        return

    # Verify notes exist and belong to user
    from_note = db.query(Note).filter(Note.id == payload["from_note_id"], Note.user_id == user_id).first()
    to_note = db.query(Note).filter(Note.id == payload["to_note_id"], Note.user_id == user_id).first()

    if not from_note or not to_note:
        raise ValidationError("One or both notes not found or don't belong to user")

    # Create relation
    relation = Relation(
        id=entity_id,
        from_note_id=payload["from_note_id"],
        to_note_id=payload["to_note_id"],
        relation_type=payload["relation_type"],
        created_at=datetime.fromisoformat(payload["created_at"].replace("Z", "+00:00")),
    )
    db.add(relation)
    logger.debug(f"Processed relation insert: {entity_id}")


def process_relation_delete(
    db: Session,
    user_id: str,
    entity_id: str,
    payload: Dict[str, Any]
) -> None:
    """
    Process relation delete operation.

    Args:
        db: Database session
        user_id: User ID
        entity_id: Relation ID
        payload: Relation data (ignored for delete)
    """
    relation = db.query(Relation).filter(Relation.id == entity_id).first()
    if relation:
        # Verify ownership via notes
        from_note = db.query(Note).filter(Note.id == relation.from_note_id, Note.user_id == user_id).first()
        if from_note:
            db.delete(relation)
            logger.debug(f"Deleted relation: {entity_id}")
        else:
            logger.warning(f"Relation {entity_id} does not belong to user {user_id}")


def process_reflection_insert(
    db: Session,
    user_id: str,
    entity_id: str,
    payload: Dict[str, Any]
) -> None:
    """
    Process reflection insert/update operation.

    Args:
        db: Database session
        user_id: User ID
        entity_id: Reflection date (YYYY-MM-DD)
        payload: Reflection data
    """
    required_fields = ["date", "content", "created_at", "updated_at"]
    for field in required_fields:
        if field not in payload:
            raise ValidationError(f"Missing required field: {field}")

    # Check if reflection exists
    existing = db.query(Reflection).filter(
        Reflection.user_id == user_id,
        Reflection.date == payload["date"]
    ).first()

    if existing:
        # Update
        existing.content = payload["content"]
        existing.updated_at = datetime.fromisoformat(payload["updated_at"].replace("Z", "+00:00"))
        logger.debug(f"Updated reflection for date: {payload['date']}")
    else:
        # Insert
        reflection = Reflection(
            user_id=user_id,
            date=payload["date"],
            content=payload["content"],
            created_at=datetime.fromisoformat(payload["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(payload["updated_at"].replace("Z", "+00:00")),
        )
        db.add(reflection)
        logger.debug(f"Created reflection for date: {payload['date']}")


def process_reflection_delete(
    db: Session,
    user_id: str,
    entity_id: str,
    payload: Dict[str, Any]
) -> None:
    """
    Process reflection delete operation.

    Args:
        db: Database session
        user_id: User ID
        entity_id: Reflection date (YYYY-MM-DD)
        payload: Reflection data (ignored)
    """
    date = payload.get("date", entity_id)
    reflection = db.query(Reflection).filter(
        Reflection.user_id == user_id,
        Reflection.date == date
    ).first()

    if reflection:
        db.delete(reflection)
        logger.debug(f"Deleted reflection for date: {date}")


@router.post("/push", response_model=SyncPushResponse)
async def push_sync(
    request: SyncPushRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Push client changes to server.

    Processes batch of changes from client, generates embeddings,
    extracts keywords, and returns success/failure status per item.

    Args:
        request: Push sync request with changes
        current_user: Authenticated user
        db: Database session

    Returns:
        SyncPushResponse with results and new checkpoint

    Raises:
        HTTPException: If processing fails
    """
    start_time = time.time()
    logger.info(f"Push sync started for user {current_user.id}, {len(request.changes)} changes")

    results = []
    success_count = 0
    failure_count = 0

    # Process each change
    for change in request.changes:
        try:
            entity_type = change.entity_type
            entity_id = change.entity_id
            operation = change.operation
            payload = change.payload

            logger.debug(f"Processing {operation} for {entity_type} {entity_id}")

            # Route to appropriate handler
            if entity_type == "note":
                if operation == "insert":
                    process_note_insert(db, current_user.id, entity_id, payload)
                elif operation == "update":
                    process_note_update(db, current_user.id, entity_id, payload)
                elif operation == "delete":
                    process_note_delete(db, current_user.id, entity_id, payload)
                else:
                    raise ValidationError(f"Unknown operation: {operation}")

            elif entity_type == "relation":
                if operation == "insert":
                    process_relation_insert(db, current_user.id, entity_id, payload)
                elif operation == "delete":
                    process_relation_delete(db, current_user.id, entity_id, payload)
                else:
                    raise ValidationError(f"Unknown operation for relation: {operation}")

            elif entity_type == "reflection":
                if operation in ("insert", "update"):
                    process_reflection_insert(db, current_user.id, entity_id, payload)
                elif operation == "delete":
                    process_reflection_delete(db, current_user.id, entity_id, payload)
                else:
                    raise ValidationError(f"Unknown operation for reflection: {operation}")
            else:
                raise ValidationError(f"Unknown entity type: {entity_type}")

            # Commit after each change to avoid losing work on error
            db.commit()

            results.append(SyncPushItemResult(
                entity_id=entity_id,
                success=True,
                error=None
            ))
            success_count += 1

        except (ValidationError, DatabaseError, SQLAlchemyError) as e:
            db.rollback()
            logger.error(f"Failed to process {change.entity_type} {change.entity_id}: {e}")

            results.append(SyncPushItemResult(
                entity_id=change.entity_id,
                success=False,
                error=str(e)
            ))
            failure_count += 1

        except Exception as e:
            db.rollback()
            logger.error(f"Unexpected error processing {change.entity_type} {change.entity_id}: {e}", exc_info=True)

            results.append(SyncPushItemResult(
                entity_id=change.entity_id,
                success=False,
                error=f"Internal error: {str(e)}"
            ))
            failure_count += 1

    # Generate checkpoint
    new_checkpoint = generate_checkpoint()

    elapsed_time = time.time() - start_time
    logger.info(
        f"Push sync completed for user {current_user.id}: "
        f"{success_count} success, {failure_count} failure, "
        f"{elapsed_time:.2f}s"
    )

    return SyncPushResponse(
        success_count=success_count,
        failure_count=failure_count,
        results=results,
        new_checkpoint=new_checkpoint,
    )


@router.post("/pull", response_model=SyncPullResponse)
async def pull_sync(
    request: SyncPullRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Pull server changes to client.

    Returns delta of changes since last checkpoint.

    Args:
        request: Pull sync request with checkpoint
        current_user: Authenticated user
        db: Database session

    Returns:
        SyncPullResponse with changes and new checkpoint

    Raises:
        HTTPException: If query fails
    """
    start_time = time.time()
    logger.info(f"Pull sync started for user {current_user.id}, checkpoint: {request.checkpoint}")

    # Parse checkpoint (if provided)
    checkpoint_dt = None
    if request.checkpoint:
        try:
            checkpoint_dt = datetime.fromisoformat(request.checkpoint.replace("Z", "+00:00"))
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid checkpoint format: {e}"
            )

    changes = []

    try:
        # Query notes changed since checkpoint
        note_query = db.query(Note).filter(Note.user_id == current_user.id)
        if checkpoint_dt:
            note_query = note_query.filter(Note.server_timestamp > checkpoint_dt)

        notes = note_query.order_by(Note.server_timestamp).limit(100).all()

        for note in notes:
            # Determine operation
            if note.deleted_at:
                operation = "delete"
                data = None
            else:
                operation = "upsert"
                data = {
                    "id": note.id,
                    "body": note.body,
                    "importance": note.importance,
                    "source_url": note.source_url,
                    "image_path": note.image_path,
                    "created_at": note.created_at.isoformat(),
                    "updated_at": note.updated_at.isoformat(),
                    "deleted_at": note.deleted_at.isoformat() if note.deleted_at else None,
                }

            changes.append(Delta(
                entity_type="note",
                entity_id=note.id,
                operation=operation,
                data=data,
                updated_at=note.updated_at,
                server_timestamp=note.server_timestamp,
            ))

        # Query relations changed since checkpoint
        # Relations don't have server_timestamp, so we use created_at
        relation_query = db.query(Relation).join(
            Note, Relation.from_note_id == Note.id
        ).filter(Note.user_id == current_user.id)

        if checkpoint_dt:
            relation_query = relation_query.filter(Relation.created_at > checkpoint_dt)

        relations = relation_query.order_by(Relation.created_at).limit(100).all()

        for relation in relations:
            changes.append(Delta(
                entity_type="relation",
                entity_id=relation.id,
                operation="upsert",
                data={
                    "id": relation.id,
                    "from_note_id": relation.from_note_id,
                    "to_note_id": relation.to_note_id,
                    "relation_type": relation.relation_type,
                    "created_at": relation.created_at.isoformat(),
                },
                updated_at=relation.created_at,  # Use created_at as updated_at
                server_timestamp=relation.created_at,  # Use created_at as server_timestamp
            ))

        # Query reflections changed since checkpoint
        reflection_query = db.query(Reflection).filter(Reflection.user_id == current_user.id)
        if checkpoint_dt:
            reflection_query = reflection_query.filter(Reflection.updated_at > checkpoint_dt)

        reflections = reflection_query.order_by(Reflection.updated_at).limit(100).all()

        for reflection in reflections:
            changes.append(Delta(
                entity_type="reflection",
                entity_id=reflection.date,
                operation="upsert",
                data={
                    "date": reflection.date,
                    "content": reflection.content,
                    "created_at": reflection.created_at.isoformat(),
                    "updated_at": reflection.updated_at.isoformat(),
                },
                updated_at=reflection.updated_at,
                server_timestamp=reflection.updated_at,  # Use updated_at as server_timestamp
            ))

    except SQLAlchemyError as e:
        logger.error(f"Database error during pull sync: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error during sync"
        )

    # Generate new checkpoint
    new_checkpoint = generate_checkpoint()

    # Check if there are more changes (pagination)
    has_more = len(changes) >= 300  # 100 per entity type

    elapsed_time = time.time() - start_time
    logger.info(
        f"Pull sync completed for user {current_user.id}: "
        f"{len(changes)} changes, has_more: {has_more}, "
        f"{elapsed_time:.2f}s"
    )

    return SyncPullResponse(
        has_more=has_more,
        changes=changes,
        new_checkpoint=new_checkpoint,
        total_changes=len(changes),
    )
