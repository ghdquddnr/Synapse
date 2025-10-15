"""
Recommendation service for finding related notes.

Uses hybrid scoring with:
- Embedding similarity (60% weight): pgvector cosine similarity
- Keyword overlap (30% weight): Jaccard similarity
- Temporal proximity (10% weight): Recent notes preferred
"""

from datetime import datetime, timedelta
from typing import List

import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..core.logging import get_logger
from ..models.note import Note
from ..schemas.recommendation import RecommendationResult, RecommendedNote

logger = get_logger(__name__)


class RecommendationService:
    """Service for generating note recommendations using hybrid scoring."""

    def __init__(self):
        """Initialize recommendation service."""
        self.embedding_weight = 0.6
        self.keyword_weight = 0.3
        self.temporal_weight = 0.1
        self.min_similarity_threshold = 0.3
        self.max_candidates = 50  # Retrieve top 50 from pgvector, then post-process
        logger.info("Recommendation service initialized")

    def _calculate_keyword_similarity(
        self, target_keywords: List[str], candidate_keywords: List[str]
    ) -> float:
        """
        Calculate Jaccard similarity between keyword sets.

        Args:
            target_keywords: Keywords from target note
            candidate_keywords: Keywords from candidate note

        Returns:
            Jaccard similarity score (0.0 to 1.0)
        """
        if not target_keywords or not candidate_keywords:
            return 0.0

        target_set = set(target_keywords)
        candidate_set = set(candidate_keywords)

        intersection = len(target_set & candidate_set)
        union = len(target_set | candidate_set)

        if union == 0:
            return 0.0

        return intersection / union

    def _calculate_temporal_score(
        self, target_created: datetime, candidate_created: datetime
    ) -> float:
        """
        Calculate temporal proximity score.

        Recent notes get higher scores (exponential decay).

        Args:
            target_created: Creation time of target note
            candidate_created: Creation time of candidate note

        Returns:
            Temporal score (0.0 to 1.0)
        """
        time_diff = abs((target_created - candidate_created).total_seconds())
        days_diff = time_diff / 86400  # Convert to days

        # Exponential decay: score = e^(-days/30)
        # Half-life of ~21 days
        decay_factor = 30.0
        score = np.exp(-days_diff / decay_factor)

        return float(score)

    def _calculate_hybrid_score(
        self,
        embedding_similarity: float,
        keyword_similarity: float,
        temporal_score: float,
    ) -> float:
        """
        Calculate final hybrid score using weighted combination.

        Args:
            embedding_similarity: Cosine similarity from embeddings (0-1)
            keyword_similarity: Jaccard similarity from keywords (0-1)
            temporal_score: Temporal proximity score (0-1)

        Returns:
            Final hybrid score (0-1)
        """
        hybrid_score = (
            self.embedding_weight * embedding_similarity
            + self.keyword_weight * keyword_similarity
            + self.temporal_weight * temporal_score
        )

        return hybrid_score

    def _generate_recommendation_reason(
        self,
        embedding_sim: float,
        keyword_sim: float,
        temporal_score: float,
        common_keywords: List[str],
    ) -> str:
        """
        Generate human-readable recommendation reason.

        Args:
            embedding_sim: Embedding similarity score
            keyword_sim: Keyword similarity score
            temporal_score: Temporal proximity score
            common_keywords: List of common keywords

        Returns:
            Recommendation reason string
        """
        reasons = []

        # Semantic similarity
        if embedding_sim > 0.7:
            reasons.append("내용이 매우 유사합니다")
        elif embedding_sim > 0.5:
            reasons.append("관련된 주제를 다룹니다")

        # Keyword overlap
        if common_keywords:
            if len(common_keywords) >= 3:
                kw_str = ", ".join(common_keywords[:3])
                reasons.append(f"공통 키워드: {kw_str}")
            elif len(common_keywords) >= 1:
                kw_str = ", ".join(common_keywords)
                reasons.append(f"키워드 '{kw_str}' 관련")

        # Temporal proximity
        if temporal_score > 0.8:
            reasons.append("최근 작성된 메모")

        if not reasons:
            reasons.append("유사한 맥락")

        return " | ".join(reasons)

    def get_recommendations(
        self, db: Session, note_id: str, user_id: str, k: int = 10
    ) -> RecommendationResult:
        """
        Get top-k recommended notes for a given note.

        Args:
            db: Database session
            note_id: ID of the target note
            user_id: ID of the user (for permission check)
            k: Number of recommendations to return (default: 10)

        Returns:
            RecommendationResult with recommendations and metadata

        Raises:
            ValueError: If note not found or user doesn't own the note
        """
        # Get target note
        target_note = db.query(Note).filter(
            Note.id == note_id, Note.user_id == user_id, Note.deleted_at.is_(None)
        ).first()

        if not target_note:
            raise ValueError(f"Note {note_id} not found or access denied")

        if target_note.embedding is None:
            logger.warning(f"Note {note_id} has no embedding, cannot recommend")
            return RecommendationResult(
                note_id=note_id,
                recommendations=[],
                total_candidates=0,
                processing_time_ms=0,
            )

        start_time = datetime.utcnow()

        # Step 1: Get candidates using pgvector cosine similarity
        # Use raw SQL for pgvector cosine distance operator (<=>)
        query = text("""
            SELECT
                id,
                body,
                created_at,
                1 - (embedding <=> :target_embedding) as embedding_similarity
            FROM notes
            WHERE user_id = :user_id
                AND id != :note_id
                AND deleted_at IS NULL
                AND embedding IS NOT NULL
            ORDER BY embedding <=> :target_embedding
            LIMIT :max_candidates
        """)

        # Convert numpy array to list for PostgreSQL
        embedding_list = target_note.embedding.tolist() if isinstance(
            target_note.embedding, np.ndarray
        ) else target_note.embedding

        result = db.execute(
            query,
            {
                "target_embedding": embedding_list,
                "user_id": user_id,
                "note_id": note_id,
                "max_candidates": self.max_candidates,
            },
        )

        candidates = result.fetchall()

        if not candidates:
            logger.info(f"No candidates found for note {note_id}")
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            return RecommendationResult(
                note_id=note_id,
                recommendations=[],
                total_candidates=0,
                processing_time_ms=int(processing_time),
            )

        # Step 2: Get full Note objects for candidates
        candidate_ids = [row[0] for row in candidates]
        candidate_notes = db.query(Note).filter(Note.id.in_(candidate_ids)).all()

        # Map candidate data
        candidate_map = {row[0]: row for row in candidates}

        # Get target keywords
        target_keywords = [kw.keyword.name for kw in target_note.keywords] if target_note.keywords else []

        # Step 3: Calculate hybrid scores and build recommendations
        recommendations = []

        for candidate_note in candidate_notes:
            candidate_data = candidate_map[candidate_note.id]
            embedding_sim = float(candidate_data[3])  # Already calculated by pgvector

            # Calculate keyword similarity
            candidate_keywords = [kw.keyword.name for kw in candidate_note.keywords] if candidate_note.keywords else []
            keyword_sim = self._calculate_keyword_similarity(target_keywords, candidate_keywords)

            # Calculate temporal score
            temporal_score = self._calculate_temporal_score(
                target_note.created_at, candidate_note.created_at
            )

            # Calculate hybrid score
            hybrid_score = self._calculate_hybrid_score(
                embedding_sim, keyword_sim, temporal_score
            )

            # Filter by threshold
            if hybrid_score < self.min_similarity_threshold:
                continue

            # Find common keywords
            common_keywords = list(set(target_keywords) & set(candidate_keywords))

            # Generate reason
            reason = self._generate_recommendation_reason(
                embedding_sim, keyword_sim, temporal_score, common_keywords
            )

            # Create recommendation
            recommendations.append(
                RecommendedNote(
                    note_id=candidate_note.id,
                    body_preview=candidate_note.body[:100],  # First 100 chars
                    score=hybrid_score,
                    reason=reason,
                    created_at=candidate_note.created_at,
                    common_keywords=common_keywords,
                )
            )

        # Step 4: Sort by hybrid score and take top-k
        recommendations.sort(key=lambda x: x.score, reverse=True)
        top_recommendations = recommendations[:k]

        processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000

        logger.info(
            f"Generated {len(top_recommendations)} recommendations for note {note_id} "
            f"(processed {len(candidates)} candidates in {processing_time:.1f}ms)"
        )

        return RecommendationResult(
            note_id=note_id,
            recommendations=top_recommendations,
            total_candidates=len(candidates),
            processing_time_ms=int(processing_time),
        )


# Singleton instance
_recommendation_service: RecommendationService | None = None


def get_recommendation_service() -> RecommendationService:
    """
    Get singleton instance of RecommendationService.

    Returns:
        Singleton RecommendationService instance
    """
    global _recommendation_service
    if _recommendation_service is None:
        _recommendation_service = RecommendationService()
    return _recommendation_service
