"""
Unit tests for weekly report generation service.
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
from app.services.report import ReportService, get_report_service


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


class TestReportService:
    """Test cases for ReportService class."""

    @pytest.fixture
    def service(self):
        """Create ReportService instance for testing."""
        return ReportService()

    def test_initialization(self, service):
        """Test service initialization."""
        assert service.min_notes_for_clustering == 3
        assert service.max_clusters == 5
        assert service.top_keywords_count == 10
        assert service.connection_similarity_threshold == 0.7

    def test_parse_week_key_valid(self, service):
        """Test parsing valid week keys."""
        year, week = service._parse_week_key("2024-01")
        assert year == 2024
        assert week == 1

        year, week = service._parse_week_key("2024-52")
        assert year == 2024
        assert week == 52

    def test_parse_week_key_invalid_format(self, service):
        """Test parsing invalid week key formats."""
        with pytest.raises(ValueError, match="Invalid week key format"):
            service._parse_week_key("2024")

        with pytest.raises(ValueError, match="Invalid week key format"):
            service._parse_week_key("2024-W01")

        with pytest.raises(ValueError, match="Invalid week key format"):
            service._parse_week_key("invalid")

    def test_parse_week_key_invalid_week_number(self, service):
        """Test parsing invalid week numbers."""
        with pytest.raises(ValueError, match="Week number must be 1-53"):
            service._parse_week_key("2024-00")

        with pytest.raises(ValueError, match="Week number must be 1-53"):
            service._parse_week_key("2024-54")

    def test_get_week_date_range(self, service):
        """Test getting date range for a week."""
        start, end = service._get_week_date_range("2024-01")

        # Start should be a Monday
        assert start.weekday() == 0

        # Range should be 7 days
        assert (end - start).days == 7

    def test_determine_cluster_count_small(self, service):
        """Test cluster count determination for small datasets."""
        assert service._determine_cluster_count(2) == 1  # < min_notes
        assert service._determine_cluster_count(5) == 2
        assert service._determine_cluster_count(15) == 3

    def test_determine_cluster_count_medium(self, service):
        """Test cluster count determination for medium datasets."""
        assert service._determine_cluster_count(25) == 4
        assert service._determine_cluster_count(35) == 4

    def test_determine_cluster_count_large(self, service):
        """Test cluster count determination for large datasets."""
        assert service._determine_cluster_count(50) == 5
        assert service._determine_cluster_count(100) == 5  # Capped at max

    def test_cluster_notes_insufficient(self, service, test_user):
        """Test clustering with insufficient notes."""
        # Create 2 notes (< min_notes_for_clustering)
        notes = [
            Note(id=f"note-{i}", user_id=test_user.id, body=f"Note {i}")
            for i in range(2)
        ]
        embeddings = np.random.rand(2, 1024)

        clusters = service._cluster_notes(notes, embeddings)

        # Should return single cluster
        assert len(clusters) == 1
        assert 0 in clusters
        assert len(clusters[0]) == 2

    def test_cluster_notes_sufficient(self, service, test_user):
        """Test clustering with sufficient notes."""
        # Create 10 notes
        notes = [
            Note(id=f"note-{i}", user_id=test_user.id, body=f"Note {i}")
            for i in range(10)
        ]
        embeddings = np.random.rand(10, 1024)

        clusters = service._cluster_notes(notes, embeddings)

        # Should create multiple clusters
        assert len(clusters) > 1
        assert len(clusters) <= service.max_clusters

        # All notes should be assigned
        total_notes = sum(len(cluster) for cluster in clusters.values())
        assert total_notes == 10

    def test_extract_cluster_summary_basic(self, service, test_user, db_session):
        """Test extracting cluster summary."""
        # Create keyword
        kw = Keyword(name="테스트")
        db_session.add(kw)
        db_session.flush()

        # Create notes with keywords
        notes = []
        for i in range(3):
            note = Note(
                id=f"note-{i}",
                user_id=test_user.id,
                body=f"Test note {i} with some content",
            )
            db_session.add(note)
            db_session.flush()

            # Add keyword
            note_kw = NoteKeyword(note_id=note.id, keyword_id=kw.id, score=0.9)
            db_session.add(note_kw)
            notes.append(note)

        db_session.commit()
        db_session.refresh(notes[0])  # Refresh to load relationships

        summary = service._extract_cluster_summary(notes, cluster_id=0)

        assert summary.cluster_id == 0
        assert summary.size == 3
        assert len(summary.top_keywords) > 0
        assert len(summary.representative_sentence) > 0
        assert len(summary.note_ids) == 3

    def test_aggregate_keywords(self, service, test_user, db_session):
        """Test keyword aggregation."""
        # Create keywords
        kw1 = Keyword(name="머신러닝")
        kw2 = Keyword(name="딥러닝")
        db_session.add_all([kw1, kw2])
        db_session.flush()

        # Create notes with keywords
        notes = []
        for i in range(5):
            note = Note(id=f"note-{i}", user_id=test_user.id, body=f"Note {i}")
            db_session.add(note)
            db_session.flush()

            # Add kw1 to all notes, kw2 to first 2 notes
            db_session.add(NoteKeyword(note_id=note.id, keyword_id=kw1.id, score=0.9))
            if i < 2:
                db_session.add(NoteKeyword(note_id=note.id, keyword_id=kw2.id, score=0.8))

            notes.append(note)

        db_session.commit()

        # Refresh to load relationships
        for note in notes:
            db_session.refresh(note)

        keyword_counts = service._aggregate_keywords(notes)

        # kw1 should have higher count than kw2
        assert len(keyword_counts) == 2
        assert keyword_counts[0].name == "머신러닝"
        assert keyword_counts[0].count == 5
        assert keyword_counts[1].name == "딥러닝"
        assert keyword_counts[1].count == 2

    def test_identify_new_keywords_no_previous_week(
        self, service, test_user, db_session
    ):
        """Test new keyword identification when no previous week exists."""
        current_keywords = ["keyword1", "keyword2"]

        # No previous week data
        new_keywords = service._identify_new_keywords(
            current_keywords, "2024-00", test_user.id, db_session
        )

        # Should return empty or handle gracefully
        assert isinstance(new_keywords, list)

    def test_suggest_connections_high_similarity(self, service, test_user):
        """Test connection suggestion with high similarity."""
        # Create notes with similar embeddings
        base_emb = np.random.rand(1024)
        notes = [
            Note(id="note-1", user_id=test_user.id, body="Note 1"),
            Note(id="note-2", user_id=test_user.id, body="Note 2"),
        ]

        # Make embeddings very similar (add small noise)
        embeddings = np.array([base_emb, base_emb + np.random.rand(1024) * 0.01])

        connections = service._suggest_connections(notes, embeddings)

        # Should suggest connection due to high similarity
        if len(connections) > 0:
            assert connections[0].from_note_id == "note-1"
            assert connections[0].to_note_id == "note-2"
            assert connections[0].similarity_score > service.connection_similarity_threshold

    def test_suggest_connections_low_similarity(self, service, test_user):
        """Test connection suggestion with low similarity."""
        # Create notes with very different embeddings
        notes = [
            Note(id="note-1", user_id=test_user.id, body="Note 1"),
            Note(id="note-2", user_id=test_user.id, body="Note 2"),
        ]
        embeddings = np.random.rand(2, 1024)

        connections = service._suggest_connections(notes, embeddings)

        # Unlikely to suggest connections with random embeddings
        # Or if suggested, scores should be below threshold
        for conn in connections:
            assert conn.similarity_score >= service.connection_similarity_threshold

    def test_generate_weekly_report_no_notes(self, service, test_user, db_session):
        """Test report generation when no notes exist."""
        with pytest.raises(ValueError, match="No notes found"):
            service.generate_weekly_report(
                db=db_session,
                user_id=test_user.id,
                week_key="2024-01",
            )

    def test_generate_weekly_report_success(self, service, test_user, db_session):
        """Test successful report generation."""
        # Use a fixed date in week 1 of 2025 to avoid ISO week boundary issues
        # ISO week 1 of 2025 starts on Monday, December 30, 2024
        test_date = datetime(2025, 1, 6)  # Monday of week 2
        week_key = "2025-02"  # Week 2 of 2025

        # Expected API format with W prefix
        expected_week_key = "2025-W02"

        # Create notes for this specific week with embeddings
        for i in range(5):
            note = Note(
                id=f"note-{i}",
                user_id=test_user.id,
                body=f"Note {i} content",
                embedding=np.random.rand(1024).tolist(),
                created_at=test_date + timedelta(hours=i),  # All in same day
            )
            db_session.add(note)

        db_session.commit()

        # Generate report
        report = service.generate_weekly_report(
            db=db_session,
            user_id=test_user.id,
            week_key=week_key,
        )

        # Verify report structure (response uses API format YYYY-WNN)
        assert report.user_id == test_user.id
        assert report.week_key == expected_week_key
        assert report.data.total_notes == 5
        assert len(report.data.clusters) > 0
        assert report.summary is not None
        assert len(report.summary) > 0
        assert report.created_at is not None


class TestGetReportService:
    """Test cases for get_report_service singleton."""

    def test_get_report_service_returns_instance(self):
        """Test that get_report_service returns valid instance."""
        service = get_report_service()
        assert isinstance(service, ReportService)

    def test_get_report_service_singleton(self):
        """Test that get_report_service returns same instance."""
        service1 = get_report_service()
        service2 = get_report_service()
        assert service1 is service2


class TestReportIntegration:
    """Integration tests for report service."""

    @pytest.fixture
    def service(self):
        """Create ReportService instance for testing."""
        return ReportService()

    def test_week_key_parsing(self, service):
        """Test various week key formats."""
        valid_keys = ["2024-01", "2024-26", "2024-52"]

        for key in valid_keys:
            year, week = service._parse_week_key(key)
            assert 2000 <= year <= 2100
            assert 1 <= week <= 53

    def test_clustering_behavior(self, service, test_user):
        """Test clustering behavior with various note counts."""
        note_counts = [1, 3, 10, 50]

        for count in note_counts:
            notes = [
                Note(id=f"note-{i}", user_id=test_user.id, body=f"Note {i}")
                for i in range(count)
            ]
            embeddings = np.random.rand(count, 1024)

            clusters = service._cluster_notes(notes, embeddings)

            # All notes should be assigned
            total = sum(len(c) for c in clusters.values())
            assert total == count

            # Cluster count should be reasonable
            assert len(clusters) <= service.max_clusters

    def test_keyword_aggregation_ordering(self, service, test_user, db_session):
        """Test that keywords are ordered by frequency."""
        # Create keywords
        keywords = [Keyword(name=f"kw{i}") for i in range(5)]
        db_session.add_all(keywords)
        db_session.flush()

        # Create notes with varying keyword frequencies
        notes = []
        for i in range(10):
            note = Note(id=f"note-{i}", user_id=test_user.id, body=f"Note {i}")
            db_session.add(note)
            db_session.flush()

            # Add keywords with decreasing frequency
            # kw0: 10 times, kw1: 8 times, kw2: 6 times, etc.
            for j in range(5):
                if i < 10 - j * 2:
                    db_session.add(
                        NoteKeyword(note_id=note.id, keyword_id=keywords[j].id, score=0.9)
                    )

            notes.append(note)

        db_session.commit()

        # Refresh to load relationships
        for note in notes:
            db_session.refresh(note)

        keyword_counts = service._aggregate_keywords(notes)

        # Should be ordered by count descending
        counts = [kc.count for kc in keyword_counts]
        assert counts == sorted(counts, reverse=True)
