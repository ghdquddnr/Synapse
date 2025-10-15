"""
Weekly report generation service using clustering and keyword analysis.

Generates insights from a week's worth of notes including:
- Note clustering by semantic similarity
- Top keywords and trends
- Potential connections between notes
"""

from collections import Counter
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

import numpy as np
from sklearn.cluster import KMeans
from sqlalchemy import and_
from sqlalchemy.orm import Session

from ..core.logging import get_logger
from ..models.note import Note
from ..models.weekly_report import WeeklyReport
from ..schemas.report import (
    ClusterSummary,
    KeywordCount,
    PotentialConnection,
    WeeklyReportData,
    WeeklyReportResponse,
)

logger = get_logger(__name__)


class ReportService:
    """Service for generating weekly insight reports."""

    def __init__(self):
        """Initialize report service."""
        self.min_notes_for_clustering = 3
        self.max_clusters = 5
        self.top_keywords_count = 10
        self.connection_similarity_threshold = 0.7
        logger.info("Report service initialized")

    def _parse_week_key(self, week_key: str) -> Tuple[int, int]:
        """
        Parse ISO week key (YYYY-WW) to year and week number.

        Args:
            week_key: Week string in YYYY-WW format (e.g., "2024-52")

        Returns:
            Tuple of (year, week_number)

        Raises:
            ValueError: If week_key format is invalid
        """
        try:
            year_str, week_str = week_key.split("-")
            year = int(year_str)
            week = int(week_str)

            if not (1 <= week <= 53):
                raise ValueError(f"Week number must be 1-53, got {week}")

            return year, week
        except (ValueError, AttributeError) as e:
            raise ValueError(f"Invalid week key format. Expected YYYY-WW, got {week_key}") from e

    def _get_week_date_range(self, week_key: str) -> Tuple[datetime, datetime]:
        """
        Get start and end dates for an ISO week.

        Args:
            week_key: Week string in YYYY-WW format

        Returns:
            Tuple of (start_date, end_date) for the week
        """
        year, week = self._parse_week_key(week_key)

        # ISO 8601: Week 1 is the first week with Thursday in the new year
        jan4 = datetime(year, 1, 4)
        week_start = jan4 - timedelta(days=jan4.weekday())  # Monday of week 1
        target_week_start = week_start + timedelta(weeks=week - 1)
        target_week_end = target_week_start + timedelta(days=7)

        return target_week_start, target_week_end

    def _determine_cluster_count(self, n_notes: int) -> int:
        """
        Determine optimal number of clusters based on note count.

        Args:
            n_notes: Number of notes

        Returns:
            Optimal cluster count
        """
        if n_notes < self.min_notes_for_clustering:
            return 1
        elif n_notes < 10:
            return 2
        elif n_notes < 20:
            return 3
        elif n_notes < 40:
            return 4
        else:
            return self.max_clusters

    def _cluster_notes(
        self, notes: List[Note], embeddings: np.ndarray
    ) -> Dict[int, List[Note]]:
        """
        Cluster notes by semantic similarity using KMeans.

        Args:
            notes: List of notes to cluster
            embeddings: Note embeddings array (n_notes, embedding_dim)

        Returns:
            Dictionary mapping cluster_id to list of notes
        """
        n_notes = len(notes)
        n_clusters = self._determine_cluster_count(n_notes)

        if n_notes < self.min_notes_for_clustering:
            # Not enough notes for clustering, return single cluster
            return {0: notes}

        # Perform KMeans clustering
        logger.debug(f"Clustering {n_notes} notes into {n_clusters} clusters")
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(embeddings)

        # Group notes by cluster
        clusters = {}
        for idx, label in enumerate(cluster_labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(notes[idx])

        logger.debug(f"Created {len(clusters)} clusters with sizes: {[len(c) for c in clusters.values()]}")
        return clusters

    def _extract_cluster_summary(
        self, cluster_notes: List[Note], cluster_id: int
    ) -> ClusterSummary:
        """
        Extract summary information for a cluster.

        Args:
            cluster_notes: List of notes in the cluster
            cluster_id: Cluster identifier

        Returns:
            ClusterSummary with representative info
        """
        # Get all keywords from cluster notes
        all_keywords = []
        for note in cluster_notes:
            if note.keywords:
                all_keywords.extend([kw.keyword.name for kw in note.keywords])

        # Count keyword frequencies
        keyword_counts = Counter(all_keywords)
        top_keywords = [kw for kw, _ in keyword_counts.most_common(3)]

        # Get representative note (first note by creation time)
        representative_note = sorted(cluster_notes, key=lambda n: n.created_at)[0]
        representative_text = representative_note.body[:100]  # First 100 chars

        return ClusterSummary(
            cluster_id=cluster_id,
            note_count=len(cluster_notes),
            top_keywords=top_keywords,
            representative_text=representative_text,
        )

    def _aggregate_keywords(self, notes: List[Note]) -> List[KeywordCount]:
        """
        Aggregate and count keywords across all notes.

        Args:
            notes: List of notes

        Returns:
            List of KeywordCount sorted by frequency
        """
        keyword_counts = Counter()

        for note in notes:
            if note.keywords:
                for note_kw in note.keywords:
                    keyword_counts[note_kw.keyword.name] += 1

        # Convert to KeywordCount objects
        keyword_list = [
            KeywordCount(keyword=kw, count=count)
            for kw, count in keyword_counts.most_common(self.top_keywords_count)
        ]

        return keyword_list

    def _identify_new_keywords(
        self, current_keywords: List[str], previous_week_key: str, user_id: str, db: Session
    ) -> List[str]:
        """
        Identify keywords that are new this week.

        Args:
            current_keywords: Keywords from current week
            previous_week_key: Previous week identifier
            user_id: User ID
            db: Database session

        Returns:
            List of new keywords not seen in previous week
        """
        try:
            # Get previous week's report
            prev_start, prev_end = self._get_week_date_range(previous_week_key)
            prev_notes = (
                db.query(Note)
                .filter(
                    and_(
                        Note.user_id == user_id,
                        Note.created_at >= prev_start,
                        Note.created_at < prev_end,
                        Note.deleted_at.is_(None),
                    )
                )
                .all()
            )

            # Extract previous week's keywords
            prev_keywords = set()
            for note in prev_notes:
                if note.keywords:
                    prev_keywords.update([kw.keyword.name for kw in note.keywords])

            # Find new keywords
            new_keywords = [kw for kw in current_keywords if kw not in prev_keywords]
            return new_keywords[:5]  # Return top 5 new keywords

        except Exception as e:
            logger.warning(f"Could not identify new keywords: {e}")
            return []

    def _suggest_connections(
        self, notes: List[Note], embeddings: np.ndarray
    ) -> List[PotentialConnection]:
        """
        Suggest potential connections between notes based on similarity.

        Args:
            notes: List of notes
            embeddings: Note embeddings

        Returns:
            List of potential connections
        """
        connections = []

        # Calculate pairwise cosine similarities
        for i in range(len(notes)):
            for j in range(i + 1, len(notes)):
                # Cosine similarity
                emb_i = embeddings[i]
                emb_j = embeddings[j]
                similarity = np.dot(emb_i, emb_j) / (
                    np.linalg.norm(emb_i) * np.linalg.norm(emb_j)
                )

                # Only suggest high-similarity pairs
                if similarity >= self.connection_similarity_threshold:
                    connections.append(
                        PotentialConnection(
                            note_id_1=notes[i].id,
                            note_id_2=notes[j].id,
                            similarity_score=float(similarity),
                            reason=f"높은 유사도 ({similarity:.2f})",
                        )
                    )

        # Sort by similarity and return top 5
        connections.sort(key=lambda x: x.similarity_score, reverse=True)
        return connections[:5]

    def generate_weekly_report(
        self, db: Session, user_id: str, week_key: str
    ) -> WeeklyReportResponse:
        """
        Generate weekly insight report for a user.

        Args:
            db: Database session
            user_id: User ID
            week_key: Week identifier (YYYY-WW format)

        Returns:
            WeeklyReportResponse with insights and metadata

        Raises:
            ValueError: If week_key is invalid or no notes found
        """
        logger.info(f"Generating weekly report for user {user_id}, week {week_key}")
        start_time = datetime.utcnow()

        # Get week date range
        week_start, week_end = self._get_week_date_range(week_key)

        # Fetch notes for the week
        notes = (
            db.query(Note)
            .filter(
                and_(
                    Note.user_id == user_id,
                    Note.created_at >= week_start,
                    Note.created_at < week_end,
                    Note.deleted_at.is_(None),
                    Note.embedding.isnot(None),  # Only notes with embeddings
                )
            )
            .all()
        )

        if not notes:
            raise ValueError(f"No notes found for week {week_key}")

        # Extract embeddings
        embeddings = np.array([note.embedding for note in notes])

        # Cluster notes
        clusters_map = self._cluster_notes(notes, embeddings)
        cluster_summaries = [
            self._extract_cluster_summary(cluster_notes, cluster_id)
            for cluster_id, cluster_notes in clusters_map.items()
        ]

        # Aggregate keywords
        top_keywords = self._aggregate_keywords(notes)

        # Identify new keywords (compare with previous week)
        current_keywords = [kw.keyword for kw in top_keywords]
        year, week = self._parse_week_key(week_key)
        prev_week = week - 1 if week > 1 else 52
        prev_year = year if week > 1 else year - 1
        prev_week_key = f"{prev_year}-{prev_week:02d}"
        new_keywords = self._identify_new_keywords(current_keywords, prev_week_key, user_id, db)

        # Suggest potential connections
        potential_connections = self._suggest_connections(notes, embeddings)

        # Create report data
        report_data = WeeklyReportData(
            week_key=week_key,
            total_notes=len(notes),
            clusters=cluster_summaries,
            top_keywords=top_keywords,
            new_keywords=new_keywords,
            potential_connections=potential_connections,
            generated_at=datetime.utcnow(),
        )

        # Save to database
        db_report = WeeklyReport(
            user_id=user_id,
            week_key=week_key,
            data=report_data.model_dump(),  # Store as JSON
        )
        db.add(db_report)
        db.commit()

        processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000

        logger.info(
            f"Generated weekly report for week {week_key}: "
            f"{len(notes)} notes, {len(cluster_summaries)} clusters, "
            f"in {processing_time:.1f}ms"
        )

        return WeeklyReportResponse(
            week_key=week_key,
            report=report_data,
            processing_time_ms=int(processing_time),
        )


# Singleton instance
_report_service: ReportService | None = None


def get_report_service() -> ReportService:
    """
    Get singleton instance of ReportService.

    Returns:
        Singleton ReportService instance
    """
    global _report_service
    if _report_service is None:
        _report_service = ReportService()
    return _report_service
