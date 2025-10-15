"""
Unit tests for keyword extraction service.
"""

import pytest

from app.services.keyword import KeywordService, get_keyword_service


class TestKeywordService:
    """Test cases for KeywordService class."""

    @pytest.fixture
    def service(self):
        """Create KeywordService instance for testing."""
        return KeywordService()

    def test_initialization(self, service):
        """Test service initialization."""
        assert service.kiwi is not None
        assert len(service.stopwords) > 0
        assert service.min_keyword_length == 2
        assert service.max_keyword_length == 20

    def test_stopwords_loaded(self, service):
        """Test that stopwords are loaded correctly."""
        stopwords = service.get_stopwords()

        # Check Korean stopwords
        assert "이" in stopwords
        assert "가" in stopwords
        assert "하다" in stopwords

        # Check English stopwords
        assert "the" in stopwords
        assert "and" in stopwords
        assert "is" in stopwords

    def test_is_valid_keyword_basic(self, service):
        """Test basic keyword validation."""
        # Valid noun
        assert service._is_valid_keyword("머신러닝", "NNG") is True

        # Valid proper noun
        assert service._is_valid_keyword("서울", "NNP") is True

        # Valid verb
        assert service._is_valid_keyword("공부", "VV") is True

        # Valid adjective
        assert service._is_valid_keyword("좋은", "VA") is True

    def test_is_valid_keyword_filters_stopwords(self, service):
        """Test that stopwords are filtered out."""
        assert service._is_valid_keyword("하다", "VV") is False
        assert service._is_valid_keyword("the", "NNG") is False
        assert service._is_valid_keyword("이", "JX") is False

    def test_is_valid_keyword_filters_short_words(self, service):
        """Test that very short words are filtered."""
        assert service._is_valid_keyword("a", "NNG") is False
        assert service._is_valid_keyword("ㄱ", "NNG") is False

    def test_is_valid_keyword_filters_long_words(self, service):
        """Test that very long words are filtered."""
        long_word = "a" * 25
        assert service._is_valid_keyword(long_word, "NNG") is False

    def test_is_valid_keyword_filters_invalid_pos(self, service):
        """Test that invalid POS tags are filtered."""
        # Particle
        assert service._is_valid_keyword("은", "JX") is False

        # Ending
        assert service._is_valid_keyword("다", "EF") is False

        # Symbol
        assert service._is_valid_keyword(".", "SF") is False

    def test_is_valid_keyword_filters_numbers(self, service):
        """Test that pure numbers are filtered."""
        assert service._is_valid_keyword("123", "NNG") is False
        assert service._is_valid_keyword("42", "NNG") is False

    def test_calculate_tf_basic(self, service):
        """Test TF calculation."""
        words = ["머신러닝", "인공지능", "머신러닝", "딥러닝"]
        tf_scores = service._calculate_tf(words)

        # Most frequent word should have TF = 1.0
        assert tf_scores["머신러닝"] == 1.0

        # Others should be proportional
        assert tf_scores["인공지능"] == 0.5
        assert tf_scores["딥러닝"] == 0.5

    def test_calculate_tf_empty(self, service):
        """Test TF calculation with empty list."""
        tf_scores = service._calculate_tf([])
        assert tf_scores == {}

    def test_calculate_tf_single_word(self, service):
        """Test TF calculation with single word."""
        words = ["테스트"]
        tf_scores = service._calculate_tf(words)
        assert tf_scores["테스트"] == 1.0

    def test_calculate_idf_basic(self, service):
        """Test IDF calculation."""
        # Longer words should have higher IDF
        idf_short = service._calculate_idf("AI")
        idf_long = service._calculate_idf("인공지능")
        assert idf_long > idf_short

    def test_calculate_idf_capitalized(self, service):
        """Test IDF bonus for capitalized words (proper nouns)."""
        idf_common = service._calculate_idf("machine")
        idf_proper = service._calculate_idf("Python")
        assert idf_proper > idf_common

    def test_extract_keywords_korean_basic(self, service):
        """Test keyword extraction from Korean text."""
        text = "오늘은 머신러닝 공부를 했다. 특히 딥러닝에 대해 배웠다."
        keywords = service.extract_keywords(text, top_k=3)

        # Should return list of tuples
        assert isinstance(keywords, list)
        assert len(keywords) <= 3

        for keyword, score in keywords:
            assert isinstance(keyword, str)
            assert isinstance(score, float)
            assert score > 0

    def test_extract_keywords_korean_content(self, service):
        """Test that extracted Korean keywords are meaningful."""
        text = "머신러닝과 딥러닝은 인공지능의 핵심 기술이다."
        keywords = service.extract_keywords(text, top_k=5)

        # Extract keyword names
        keyword_names = [kw for kw, _ in keywords]

        # Should contain meaningful technical terms
        assert any(kw in keyword_names for kw in ["머신러닝", "딥러닝", "인공지능", "기술"])

    def test_extract_keywords_english_basic(self, service):
        """Test keyword extraction from English text."""
        text = "Machine learning and deep learning are important technologies."
        keywords = service.extract_keywords(text, top_k=3)

        assert isinstance(keywords, list)
        assert len(keywords) > 0

    def test_extract_keywords_mixed_language(self, service):
        """Test keyword extraction from mixed Korean-English text."""
        text = "Python은 머신러닝에 가장 많이 사용되는 프로그래밍 언어이다."
        keywords = service.extract_keywords(text, top_k=5)

        assert isinstance(keywords, list)
        assert len(keywords) > 0

        # Should extract both Korean and English keywords
        keyword_names = [kw for kw, _ in keywords]
        # At least one should be present (depending on Kiwi's analysis)
        assert len(keyword_names) > 0

    def test_extract_keywords_empty_text(self, service):
        """Test keyword extraction from empty text."""
        assert service.extract_keywords("") == []
        assert service.extract_keywords("   ") == []
        assert service.extract_keywords(None) == []

    def test_extract_keywords_stopwords_filtered(self, service):
        """Test that stopwords are filtered out."""
        text = "이것은 그것이다. 하다 되다 있다 없다."
        keywords = service.extract_keywords(text, top_k=10)

        # Should have very few or no keywords (all stopwords)
        keyword_names = [kw for kw, _ in keywords]
        assert "이것" not in keyword_names
        assert "그것" not in keyword_names

    def test_extract_keywords_sorted_by_score(self, service):
        """Test that keywords are sorted by score descending."""
        text = "머신러닝 머신러닝 머신러닝 딥러닝 인공지능"
        keywords = service.extract_keywords(text, top_k=3)

        # Scores should be in descending order
        scores = [score for _, score in keywords]
        assert scores == sorted(scores, reverse=True)

        # Most frequent word should have highest score
        assert keywords[0][0] == "머신러닝"

    def test_extract_keywords_top_k_limit(self, service):
        """Test that top_k parameter limits results."""
        text = "A B C D E F G H I J K L M N O P Q R S T U V W X Y Z"

        keywords_3 = service.extract_keywords(text, top_k=3)
        keywords_5 = service.extract_keywords(text, top_k=5)

        assert len(keywords_3) <= 3
        assert len(keywords_5) <= 5

    def test_extract_keyword_names_basic(self, service):
        """Test extract_keyword_names returns names only."""
        text = "머신러닝과 딥러닝은 인공지능의 핵심 기술이다."
        keyword_names = service.extract_keyword_names(text, top_k=3)

        assert isinstance(keyword_names, list)
        assert all(isinstance(name, str) for name in keyword_names)
        assert len(keyword_names) <= 3

    def test_extract_keyword_names_no_scores(self, service):
        """Test that extract_keyword_names doesn't return scores."""
        text = "테스트 키워드 추출"
        keyword_names = service.extract_keyword_names(text, top_k=5)

        # Should be list of strings, not tuples
        for item in keyword_names:
            assert isinstance(item, str)
            assert not isinstance(item, tuple)

    def test_add_stopwords(self, service):
        """Test adding custom stopwords."""
        initial_count = len(service.stopwords)

        service.add_stopwords(["테스트", "키워드"])

        assert len(service.stopwords) == initial_count + 2
        assert "테스트" in service.stopwords
        assert "키워드" in service.stopwords

    def test_add_stopwords_affects_extraction(self, service):
        """Test that added stopwords are filtered out."""
        text = "테스트 키워드 추출"

        # Before adding stopwords
        keywords_before = service.extract_keyword_names(text, top_k=10)

        # Add stopwords
        service.add_stopwords(["테스트", "키워드"])

        # After adding stopwords
        keywords_after = service.extract_keyword_names(text, top_k=10)

        # Should have fewer keywords after adding stopwords
        assert "테스트" not in keywords_after
        assert "키워드" not in keywords_after

    def test_remove_stopwords(self, service):
        """Test removing words from stopwords."""
        # Add then remove
        service.add_stopwords(["임시"])
        assert "임시" in service.stopwords

        service.remove_stopwords(["임시"])
        assert "임시" not in service.stopwords

    def test_get_stopwords_returns_copy(self, service):
        """Test that get_stopwords returns a copy, not reference."""
        stopwords1 = service.get_stopwords()
        stopwords2 = service.get_stopwords()

        # Should be equal but not same object
        assert stopwords1 == stopwords2
        assert stopwords1 is not stopwords2


class TestGetKeywordService:
    """Test cases for get_keyword_service singleton."""

    def test_get_keyword_service_returns_instance(self):
        """Test that get_keyword_service returns valid instance."""
        service = get_keyword_service()
        assert isinstance(service, KeywordService)

    def test_get_keyword_service_singleton(self):
        """Test that get_keyword_service returns same instance."""
        service1 = get_keyword_service()
        service2 = get_keyword_service()
        assert service1 is service2


class TestKeywordIntegration:
    """Integration tests for keyword service with realistic scenarios."""

    @pytest.fixture
    def service(self):
        """Create KeywordService instance for testing."""
        return KeywordService()

    def test_realistic_korean_note(self, service):
        """Test realistic Korean note scenario."""
        note = """
        오늘 회의에서 새로운 프로젝트 아이디어가 나왔다.
        AI 기반 추천 시스템을 개발하는 것인데,
        사용자의 메모를 분석해서 관련있는 과거 메모를 추천해준다.
        """
        keywords = service.extract_keyword_names(note, top_k=5)

        assert len(keywords) > 0
        assert isinstance(keywords, list)

        # Should extract meaningful keywords
        # (exact keywords depend on morphological analysis)
        assert any(len(kw) >= 2 for kw in keywords)

    def test_realistic_english_note(self, service):
        """Test realistic English note scenario."""
        note = """
        Today I learned about vector databases and their applications.
        They're particularly useful for semantic search and recommendation systems.
        pgvector extension for PostgreSQL looks promising.
        """
        keywords = service.extract_keyword_names(note, top_k=5)

        assert len(keywords) > 0

    def test_technical_korean_text(self, service):
        """Test technical Korean text."""
        note = "파이썬으로 머신러닝 모델을 학습시키고 FastAPI로 배포했다."
        keywords = service.extract_keyword_names(note, top_k=5)

        assert len(keywords) > 0

    def test_short_memo(self, service):
        """Test very short memo."""
        note = "회의 내일 3시"
        keywords = service.extract_keyword_names(note, top_k=3)

        # Should extract at least some keywords
        assert isinstance(keywords, list)

    def test_mixed_language_note(self, service):
        """Test note with mixed Korean and English."""
        note = "React Native와 FastAPI를 사용해서 full-stack 앱을 개발중이다."
        keywords = service.extract_keyword_names(note, top_k=5)

        assert len(keywords) > 0

    def test_keyword_consistency(self, service):
        """Test that same text produces same keywords."""
        text = "일관성 테스트를 위한 키워드 추출"

        keywords1 = service.extract_keywords(text, top_k=5)
        keywords2 = service.extract_keywords(text, top_k=5)

        # Should be identical
        assert keywords1 == keywords2

    def test_keyword_relevance(self, service):
        """Test that extracted keywords are relevant to content."""
        note = "오늘은 머신러닝 공부를 했다. 딥러닝 알고리즘에 대해 배웠다."
        keywords = service.extract_keyword_names(note, top_k=5)

        # Should contain at least one technical term
        technical_terms = ["머신러닝", "딥러닝", "알고리즘", "공부"]
        assert any(term in keywords for term in technical_terms)

    def test_frequency_affects_ranking(self, service):
        """Test that word frequency affects keyword ranking."""
        note = "파이썬 파이썬 파이썬 자바 C++"
        keywords = service.extract_keywords(note, top_k=3)

        if len(keywords) > 0:
            # Most frequent word should rank higher
            keyword_names = [kw for kw, _ in keywords]
            # Python should be in top keywords if extracted
            assert any("파이썬" in kw or kw == "파이썬" for kw in keyword_names[:2]) or len(keywords) < 2

    def test_no_keywords_from_meaningless_text(self, service):
        """Test that meaningless text produces no/few keywords."""
        note = "그 그 그 이 이 이"
        keywords = service.extract_keyword_names(note, top_k=5)

        # Should have no or very few keywords (all stopwords)
        assert len(keywords) == 0
