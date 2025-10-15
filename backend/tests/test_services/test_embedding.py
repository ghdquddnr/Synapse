"""
Unit tests for embedding generation service.
"""

import numpy as np
import pytest

from app.services.embedding import EmbeddingService, get_embedding_service


class TestEmbeddingService:
    """Test cases for EmbeddingService class."""

    @pytest.fixture
    def service(self):
        """Create EmbeddingService instance for testing."""
        return EmbeddingService()

    def test_initialization(self, service):
        """Test service initialization."""
        assert service.model is not None
        assert service.embedding_dim == 1024
        assert service.max_length == 512

    def test_preprocess_text_basic(self, service):
        """Test basic text preprocessing."""
        text = "  Hello   World  "
        result = service.preprocess_text(text)
        assert result == "Hello World"

    def test_preprocess_text_url_normalization(self, service):
        """Test URL normalization in preprocessing."""
        text = "Check this out: https://example.com/page?query=1"
        result = service.preprocess_text(text)
        assert result == "Check this out: [URL]"

    def test_preprocess_text_multiple_urls(self, service):
        """Test multiple URLs are normalized."""
        text = "Link1: http://example.com and Link2: https://test.org"
        result = service.preprocess_text(text)
        assert "[URL]" in result
        assert "http://" not in result
        assert "https://" not in result

    def test_preprocess_text_empty(self, service):
        """Test preprocessing empty text."""
        assert service.preprocess_text("") == ""
        assert service.preprocess_text("   ") == ""
        assert service.preprocess_text(None) == ""

    def test_preprocess_text_truncation(self, service):
        """Test text truncation for very long text."""
        long_text = "가" * 2000  # 2000 Korean characters
        result = service.preprocess_text(long_text)
        # Should be truncated to approximately max_length * 2 = 1024 chars
        assert len(result) <= service.max_length * 2

    def test_augment_short_text_very_short(self, service):
        """Test augmentation for very short text."""
        short_text = "안녕"
        result = service.augment_short_text(short_text)
        assert "짧은 메모:" in result
        assert short_text in result

    def test_augment_short_text_normal_length(self, service):
        """Test no augmentation for normal length text."""
        normal_text = "This is a normal length note with enough content"
        result = service.augment_short_text(normal_text)
        assert result == normal_text
        assert "짧은 메모:" not in result

    def test_augment_short_text_empty(self, service):
        """Test augmentation for empty text."""
        assert service.augment_short_text("") == ""
        assert service.augment_short_text("   ") == ""

    def test_generate_embedding_basic(self, service):
        """Test basic embedding generation."""
        text = "This is a test note about machine learning."
        embedding = service.generate_embedding(text)

        # Check type and shape
        assert isinstance(embedding, np.ndarray)
        assert embedding.shape == (1024,)
        assert embedding.dtype == np.float32 or embedding.dtype == np.float64

    def test_generate_embedding_korean(self, service):
        """Test embedding generation for Korean text."""
        text = "오늘은 날씨가 좋고 기분이 상쾌합니다."
        embedding = service.generate_embedding(text)

        assert embedding.shape == (1024,)
        assert not np.isnan(embedding).any()
        assert not np.isinf(embedding).any()

    def test_generate_embedding_multilingual(self, service):
        """Test embedding generation for mixed language text."""
        text = "Today I learned about 한국어 처리 and natural language processing."
        embedding = service.generate_embedding(text)

        assert embedding.shape == (1024,)

    def test_generate_embedding_empty_raises_error(self, service):
        """Test that empty text raises ValueError."""
        with pytest.raises(ValueError, match="Cannot generate embedding for empty text"):
            service.generate_embedding("")

        with pytest.raises(ValueError, match="Cannot generate embedding for empty text"):
            service.generate_embedding("   ")

    def test_generate_embedding_with_url(self, service):
        """Test embedding generation with URLs."""
        text = "Check this article: https://example.com/article"
        embedding = service.generate_embedding(text)

        # URL should be normalized to [URL]
        assert embedding.shape == (1024,)

    def test_generate_embedding_short_text(self, service):
        """Test embedding generation for short text (triggers augmentation)."""
        text = "Hi"
        embedding = service.generate_embedding(text)

        # Should still generate valid embedding with augmentation
        assert embedding.shape == (1024,)

    def test_batch_generate_embeddings_basic(self, service):
        """Test batch embedding generation."""
        texts = [
            "First note about Python programming",
            "Second note about machine learning",
            "Third note about data science",
        ]
        embeddings = service.batch_generate_embeddings(texts)

        assert len(embeddings) == 3
        for embedding in embeddings:
            assert isinstance(embedding, np.ndarray)
            assert embedding.shape == (1024,)

    def test_batch_generate_embeddings_mixed_languages(self, service):
        """Test batch generation with mixed languages."""
        texts = [
            "English note",
            "한국어 메모",
            "Mixed 언어 note with both",
        ]
        embeddings = service.batch_generate_embeddings(texts)

        assert len(embeddings) == 3
        for embedding in embeddings:
            assert embedding.shape == (1024,)

    def test_batch_generate_embeddings_with_empty(self, service):
        """Test batch generation handles empty texts."""
        texts = [
            "Valid note",
            "",  # Empty text
            "Another valid note",
        ]
        embeddings = service.batch_generate_embeddings(texts)

        # Should generate embeddings for all (empty replaced with placeholder)
        assert len(embeddings) == 3
        for embedding in embeddings:
            assert embedding.shape == (1024,)

    def test_batch_generate_embeddings_empty_list_raises_error(self, service):
        """Test that empty list raises ValueError."""
        with pytest.raises(ValueError, match="Cannot generate embeddings for empty list"):
            service.batch_generate_embeddings([])

    def test_batch_generate_embeddings_single_item(self, service):
        """Test batch generation with single item."""
        texts = ["Single note"]
        embeddings = service.batch_generate_embeddings(texts)

        assert len(embeddings) == 1
        assert embeddings[0].shape == (1024,)

    def test_embeddings_are_different_for_different_texts(self, service):
        """Test that different texts produce different embeddings."""
        text1 = "Machine learning is about algorithms"
        text2 = "I love eating pizza for dinner"

        emb1 = service.generate_embedding(text1)
        emb2 = service.generate_embedding(text2)

        # Embeddings should be different (very low cosine similarity)
        cosine_sim = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
        assert cosine_sim < 0.9  # Should be quite different

    def test_embeddings_are_similar_for_similar_texts(self, service):
        """Test that similar texts produce similar embeddings."""
        text1 = "I love machine learning and artificial intelligence"
        text2 = "Machine learning and AI are fascinating topics"

        emb1 = service.generate_embedding(text1)
        emb2 = service.generate_embedding(text2)

        # Embeddings should be similar (high cosine similarity)
        cosine_sim = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
        assert cosine_sim > 0.7  # Should be quite similar

    def test_embedding_consistency(self, service):
        """Test that same text produces same embedding (deterministic)."""
        text = "Consistency test for embeddings"

        emb1 = service.generate_embedding(text)
        emb2 = service.generate_embedding(text)

        # Should be identical (or extremely close due to float precision)
        np.testing.assert_allclose(emb1, emb2, rtol=1e-5)


class TestGetEmbeddingService:
    """Test cases for get_embedding_service singleton."""

    def test_get_embedding_service_returns_instance(self):
        """Test that get_embedding_service returns valid instance."""
        service = get_embedding_service()
        assert isinstance(service, EmbeddingService)

    def test_get_embedding_service_singleton(self):
        """Test that get_embedding_service returns same instance."""
        service1 = get_embedding_service()
        service2 = get_embedding_service()
        assert service1 is service2  # Same object reference


class TestEmbeddingIntegration:
    """Integration tests for embedding service with realistic scenarios."""

    @pytest.fixture
    def service(self):
        """Create EmbeddingService instance for testing."""
        return EmbeddingService()

    def test_realistic_korean_note(self, service):
        """Test realistic Korean note scenario."""
        note = """
        오늘 회의에서 새로운 프로젝트 아이디어가 나왔다.
        AI 기반 추천 시스템을 개발하는 것인데,
        사용자의 메모를 분석해서 관련있는 과거 메모를 추천해준다.
        """
        embedding = service.generate_embedding(note)

        assert embedding.shape == (1024,)
        assert not np.isnan(embedding).any()

    def test_realistic_english_note(self, service):
        """Test realistic English note scenario."""
        note = """
        Today I learned about vector databases and their applications.
        They're particularly useful for semantic search and recommendation systems.
        pgvector extension for PostgreSQL looks promising.
        """
        embedding = service.generate_embedding(note)

        assert embedding.shape == (1024,)

    def test_note_with_url_and_metadata(self, service):
        """Test note with URL and metadata."""
        note = "Interesting article about transformers: https://arxiv.org/abs/1706.03762"
        embedding = service.generate_embedding(note)

        assert embedding.shape == (1024,)

    def test_batch_realistic_notes(self, service):
        """Test batch processing of realistic notes."""
        notes = [
            "오늘은 머신러닝 공부를 했다. 특히 임베딩에 대해 배웠다.",
            "Meeting with team about Q4 roadmap. Focus on recommendation engine.",
            "Read paper on semantic search using dense vectors.",
            "내일 발표 준비해야함. 주제: AI 추천 시스템",
        ]
        embeddings = service.batch_generate_embeddings(notes)

        assert len(embeddings) == 4
        for embedding in embeddings:
            assert embedding.shape == (1024,)

    def test_semantic_similarity_retrieval(self, service):
        """Test that embeddings can be used for semantic similarity retrieval."""
        query = "추천 시스템 개발"
        candidates = [
            "AI 기반 추천 알고리즘 연구",  # Should be most similar
            "오늘 점심은 비빔밥을 먹었다",  # Should be least similar
            "머신러닝 모델 학습 방법",  # Medium similarity
        ]

        query_emb = service.generate_embedding(query)
        candidate_embs = service.batch_generate_embeddings(candidates)

        # Calculate cosine similarities
        similarities = []
        for cand_emb in candidate_embs:
            sim = np.dot(query_emb, cand_emb) / (
                np.linalg.norm(query_emb) * np.linalg.norm(cand_emb)
            )
            similarities.append(sim)

        # Most similar should be the first candidate
        most_similar_idx = np.argmax(similarities)
        assert most_similar_idx == 0

        # Least similar should be the second candidate
        least_similar_idx = np.argmin(similarities)
        assert least_similar_idx == 1
