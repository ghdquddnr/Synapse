"""
Unit tests for recommendation service.
"""

from datetime import datetime, timedelta

import numpy as np
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.keyword import Keyword
from app.models.note import Note
from app.models.note_keyword import NoteKeyword
from app.models.user import User
from app.services.recommendation import RecommendationService, get_recommendation_service


@pytest.fixture
def db_session():
    """Create in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    user = User(
        id="user-123",
        email="test@example.com",
        hashed_password="dummy",
    )
    db_session.add(user)
    db_session.commit()
    return user


class TestRecommendationService:
    """Test cases for RecommendationService class."""

    @pytest.fixture
    def service(self):
        """Create RecommendationService instance for testing."""
        return RecommendationService()

    def test_initialization(self, service):
        """Test service initialization."""
        assert service.embedding_weight == 0.6
        assert service.keyword_weight == 0.3
        assert service.temporal_weight == 0.1
        assert service.min_similarity_threshold == 0.3
        assert service.max_candidates == 50

    def test_weights_sum_to_one(self, service):
        """Test that scoring weights sum to 1.0."""
        total = service.embedding_weight + service.keyword_weight + service.temporal_weight
        assert abs(total - 1.0) < 0.001

    def test_calculate_keyword_similarity_exact_match(self, service):
        """Test keyword similarity with exact match."""
        keywords1 = ["머신러닝", "딥러닝", "AI"]
        keywords2 = ["머신러닝", "딥러닝", "AI"]

        similarity = service._calculate_keyword_similarity(keywords1, keywords2)
        assert similarity == 1.0

    def test_calculate_keyword_similarity_partial_overlap(self, service):
        """Test keyword similarity with partial overlap."""
        keywords1 = ["머신러닝", "딥러닝", "AI"]
        keywords2 = ["머신러닝", "AI", "Python"]

        similarity = service._calculate_keyword_similarity(keywords1, keywords2)
        # Intersection: {머신러닝, AI} = 2
        # Union: {머신러닝, 딥러닝, AI, Python} = 4
        # Jaccard: 2/4 = 0.5
        assert abs(similarity - 0.5) < 0.001

    def test_calculate_keyword_similarity_no_overlap(self, service):
        """Test keyword similarity with no overlap."""
        keywords1 = ["머신러닝", "딥러닝"]
        keywords2 = ["음식", "여행"]

        similarity = service._calculate_keyword_similarity(keywords1, keywords2)
        assert similarity == 0.0

    def test_calculate_keyword_similarity_empty_lists(self, service):
        """Test keyword similarity with empty lists."""
        assert service._calculate_keyword_similarity([], []) == 0.0
        assert service._calculate_keyword_similarity(["test"], []) == 0.0
        assert service._calculate_keyword_similarity([], ["test"]) == 0.0

    def test_calculate_temporal_score_same_time(self, service):
        """Test temporal score for notes created at same time."""
        now = datetime.utcnow()
        score = service._calculate_temporal_score(now, now)
        assert score == 1.0

    def test_calculate_temporal_score_recent(self, service):
        """Test temporal score for recent notes."""
        now = datetime.utcnow()
        one_day_ago = now - timedelta(days=1)

        score = service._calculate_temporal_score(now, one_day_ago)
        # Should be high (close to 1.0)
        assert score > 0.9

    def test_calculate_temporal_score_old(self, service):
        """Test temporal score for old notes."""
        now = datetime.utcnow()
        one_year_ago = now - timedelta(days=365)

        score = service._calculate_temporal_score(now, one_year_ago)
        # Should be low (exponential decay)
        assert score < 0.1

    def test_calculate_temporal_score_symmetric(self, service):
        """Test that temporal score is symmetric."""
        now = datetime.utcnow()
        past = now - timedelta(days=7)

        score1 = service._calculate_temporal_score(now, past)
        score2 = service._calculate_temporal_score(past, now)

        assert abs(score1 - score2) < 0.001

    def test_calculate_hybrid_score_basic(self, service):
        """Test hybrid score calculation."""
        score = service._calculate_hybrid_score(
            embedding_similarity=0.8,
            keyword_similarity=0.6,
            temporal_score=0.9,
        )

        # 0.6 * 0.8 + 0.3 * 0.6 + 0.1 * 0.9 = 0.48 + 0.18 + 0.09 = 0.75
        expected = 0.75
        assert abs(score - expected) < 0.001

    def test_calculate_hybrid_score_embedding_dominant(self, service):
        """Test that embedding has highest weight."""
        score_high_emb = service._calculate_hybrid_score(1.0, 0.0, 0.0)
        score_high_kw = service._calculate_hybrid_score(0.0, 1.0, 0.0)
        score_high_temp = service._calculate_hybrid_score(0.0, 0.0, 1.0)

        assert score_high_emb > score_high_kw
        assert score_high_emb > score_high_temp

    def test_generate_recommendation_reason_high_similarity(self, service):
        """Test reason generation for high similarity."""
        reason = service._generate_recommendation_reason(
            embedding_sim=0.85,
            keyword_sim=0.7,
            temporal_score=0.9,
            common_keywords=["머신러닝", "딥러닝", "AI"],
        )

        assert "매우 유사" in reason or "유사" in reason
        assert "머신러닝" in reason
        assert "최근" in reason

    def test_generate_recommendation_reason_medium_similarity(self, service):
        """Test reason generation for medium similarity."""
        reason = service._generate_recommendation_reason(
            embedding_sim=0.6,
            keyword_sim=0.4,
            temporal_score=0.5,
            common_keywords=["Python"],
        )

        assert "관련" in reason or "유사" in reason
        assert "Python" in reason

    def test_generate_recommendation_reason_no_keywords(self, service):
        """Test reason generation with no common keywords."""
        reason = service._generate_recommendation_reason(
            embedding_sim=0.6,
            keyword_sim=0.0,
            temporal_score=0.3,
            common_keywords=[],
        )

        assert len(reason) > 0  # Should generate some reason

    def test_get_recommendations_note_not_found(self, service, db_session, test_user):
        """Test that error is raised for non-existent note."""
        with pytest.raises(ValueError, match="not found or access denied"):
            service.get_recommendations(
                db=db_session,
                note_id="nonexistent",
                user_id=test_user.id,
                k=10,
            )

    def test_get_recommendations_no_embedding(self, service, db_session, test_user):
        """Test behavior when target note has no embedding."""
        # Create note without embedding
        note = Note(
            id="note-1",
            user_id=test_user.id,
            body="Test note",
            embedding=None,  # No embedding
        )
        db_session.add(note)
        db_session.commit()

        result = service.get_recommendations(
            db=db_session,
            note_id=note.id,
            user_id=test_user.id,
            k=10,
        )

        assert result.note_id == note.id
        assert result.recommendations == []
        assert result.total_candidates == 0

    def test_get_recommendations_no_candidates(self, service, db_session, test_user):
        """Test behavior when no candidate notes exist."""
        # Create single note with embedding
        embedding = np.random.rand(1024).astype(np.float32)
        note = Note(
            id="note-1",
            user_id=test_user.id,
            body="Only note",
            embedding=embedding.tolist(),
        )
        db_session.add(note)
        db_session.commit()

        result = service.get_recommendations(
            db=db_session,
            note_id=note.id,
            user_id=test_user.id,
            k=10,
        )

        # No other notes to recommend
        assert result.note_id == note.id
        assert result.recommendations == []


class TestGetRecommendationService:
    """Test cases for get_recommendation_service singleton."""

    def test_get_recommendation_service_returns_instance(self):
        """Test that get_recommendation_service returns valid instance."""
        service = get_recommendation_service()
        assert isinstance(service, RecommendationService)

    def test_get_recommendation_service_singleton(self):
        """Test that get_recommendation_service returns same instance."""
        service1 = get_recommendation_service()
        service2 = get_recommendation_service()
        assert service1 is service2


class TestRecommendationIntegration:
    """Integration tests for recommendation service."""

    @pytest.fixture
    def service(self):
        """Create RecommendationService instance for testing."""
        return RecommendationService()

    def test_keyword_similarity_calculation(self, service):
        """Test real-world keyword similarity scenarios."""
        # Very similar notes
        kw1 = ["머신러닝", "딥러닝", "neural network"]
        kw2 = ["머신러닝", "딥러닝", "인공지능"]
        sim_similar = service._calculate_keyword_similarity(kw1, kw2)

        # Completely different notes
        kw3 = ["음식", "레시피", "요리"]
        sim_different = service._calculate_keyword_similarity(kw1, kw3)

        # 2 common out of 4 total = 0.5, so use >= instead of >
        assert sim_similar >= 0.4
        assert sim_different == 0.0

    def test_temporal_decay_function(self, service):
        """Test temporal decay over various time periods."""
        now = datetime.utcnow()

        scores = []
        for days in [0, 1, 7, 30, 90, 365]:
            past = now - timedelta(days=days)
            score = service._calculate_temporal_score(now, past)
            scores.append((days, score))

        # Scores should decrease over time
        for i in range(len(scores) - 1):
            assert scores[i][1] >= scores[i + 1][1]

        # Recent notes should have high scores
        assert scores[0][1] == 1.0  # 0 days
        assert scores[1][1] > 0.95  # 1 day

        # Very old notes should have low scores
        assert scores[-1][1] < 0.01  # 365 days

    def test_hybrid_scoring_balance(self, service):
        """Test that hybrid scoring balances all three components."""
        # Perfect embedding, poor keywords/time
        score1 = service._calculate_hybrid_score(1.0, 0.0, 0.0)

        # Poor embedding, perfect keywords/time
        score2 = service._calculate_hybrid_score(0.0, 1.0, 1.0)

        # Embedding weight is 0.6, keyword + temporal is 0.4
        assert abs(score1 - 0.6) < 0.001
        assert abs(score2 - 0.4) < 0.001

        # Balanced scores
        score3 = service._calculate_hybrid_score(0.8, 0.8, 0.8)
        assert abs(score3 - 0.8) < 0.001

    def test_recommendation_reason_variations(self, service):
        """Test various recommendation reason scenarios."""
        # High embedding, many keywords, recent
        reason1 = service._generate_recommendation_reason(
            embedding_sim=0.9,
            keyword_sim=0.8,
            temporal_score=0.9,
            common_keywords=["AI", "ML", "deep learning", "neural nets"],
        )
        assert len(reason1) > 0
        assert "유사" in reason1 or "관련" in reason1

        # Low embedding, few keywords, old
        reason2 = service._generate_recommendation_reason(
            embedding_sim=0.4,
            keyword_sim=0.2,
            temporal_score=0.1,
            common_keywords=["Python"],
        )
        assert len(reason2) > 0

        # No keywords at all
        reason3 = service._generate_recommendation_reason(
            embedding_sim=0.5,
            keyword_sim=0.0,
            temporal_score=0.5,
            common_keywords=[],
        )
        assert len(reason3) > 0

    def test_score_thresholding(self, service):
        """Test that min_similarity_threshold is reasonable."""
        # Very low scores should be filtered
        low_score = service._calculate_hybrid_score(0.2, 0.1, 0.1)
        # 0.6 * 0.2 + 0.3 * 0.1 + 0.1 * 0.1 = 0.12 + 0.03 + 0.01 = 0.16
        assert low_score < service.min_similarity_threshold

        # Medium scores should pass
        medium_score = service._calculate_hybrid_score(0.5, 0.5, 0.5)
        # 0.6 * 0.5 + 0.3 * 0.5 + 0.1 * 0.5 = 0.3 + 0.15 + 0.05 = 0.5
        assert medium_score > service.min_similarity_threshold
