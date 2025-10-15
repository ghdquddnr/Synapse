"""
Keyword extraction service using Kiwipiepy for Korean morphological analysis.

This service extracts meaningful keywords from note text using
TF-IDF scoring with Korean morphological analysis.
"""

import re
from collections import Counter
from typing import Dict, List, Set, Tuple

from kiwipiepy import Kiwi

from ..core.logging import get_logger

logger = get_logger(__name__)


class KeywordService:
    """Service for extracting keywords from Korean/English text using morphological analysis."""

    def __init__(self):
        """Initialize the Kiwi morphological analyzer."""
        logger.info("Initializing Kiwi morphological analyzer...")
        self.kiwi = Kiwi()
        self.stopwords = self._load_stopwords()
        self.min_keyword_length = 2
        self.max_keyword_length = 20
        logger.info("Keyword service initialized successfully")

    def _load_stopwords(self) -> Set[str]:
        """
        Load Korean stopwords.

        Returns:
            Set of stopwords to filter out
        """
        # Common Korean stopwords
        korean_stopwords = {
            # Particles
            "이", "가", "을", "를", "은", "는", "의", "에", "에서", "로", "으로",
            "과", "와", "도", "만", "까지", "부터", "처럼", "같이",
            # Auxiliary verbs/adjectives
            "하다", "되다", "있다", "없다", "이다", "아니다",
            # Pronouns
            "나", "너", "우리", "저희", "그", "그녀", "이것", "그것", "저것",
            # Adverbs
            "매우", "정말", "너무", "아주", "조금", "많이", "좀",
            # Common verbs
            "보다", "가다", "오다", "주다", "받다", "말하다",
            # Numbers
            "하나", "둘", "셋", "첫", "두", "세",
        }

        # Common English stopwords
        english_stopwords = {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
            "been", "being", "have", "has", "had", "do", "does", "did", "will",
            "would", "could", "should", "may", "might", "can", "this", "that",
            "these", "those", "i", "you", "he", "she", "it", "we", "they",
        }

        return korean_stopwords | english_stopwords

    def _is_valid_keyword(self, word: str, pos: str) -> bool:
        """
        Check if a word is valid for keyword extraction.

        Args:
            word: The word to check
            pos: Part-of-speech tag

        Returns:
            True if valid keyword, False otherwise
        """
        # Filter by length
        if len(word) < self.min_keyword_length or len(word) > self.max_keyword_length:
            return False

        # Filter stopwords
        if word.lower() in self.stopwords:
            return False

        # Only keep nouns (NNG, NNP), verbs (VV), adjectives (VA), foreign words (SL)
        valid_pos = {"NNG", "NNP", "VV", "VA", "SL", "SH"}  # SH for Chinese characters
        if pos not in valid_pos:
            return False

        # Filter out pure numbers or special characters
        if re.match(r"^[\d\W]+$", word):
            return False

        return True

    def _calculate_tf(self, words: List[str]) -> Dict[str, float]:
        """
        Calculate term frequency (TF) for words.

        Args:
            words: List of words

        Returns:
            Dictionary mapping word to TF score
        """
        if not words:
            return {}

        word_counts = Counter(words)
        max_count = max(word_counts.values())

        # Normalized TF: count / max_count
        tf_scores = {word: count / max_count for word, count in word_counts.items()}

        return tf_scores

    def _calculate_idf(self, word: str, total_docs: int = 1000) -> float:
        """
        Calculate inverse document frequency (IDF) for a word.

        Since we don't have a corpus, we use heuristics:
        - Longer words tend to be more specific → higher IDF
        - Korean nouns (NNG) are more common → lower IDF
        - Proper nouns (NNP) are more specific → higher IDF

        Args:
            word: The word to calculate IDF for
            total_docs: Estimated total documents (default: 1000)

        Returns:
            IDF score
        """
        # Base IDF using word length as proxy for specificity
        base_idf = min(len(word) / 5.0, 2.0)  # Cap at 2.0

        # Bonus for proper nouns (capitalized in English, or tagged NNP)
        if word and word[0].isupper():
            base_idf += 0.5

        return base_idf

    def extract_keywords(self, body: str, top_k: int = 5) -> List[Tuple[str, float]]:
        """
        Extract top keywords from text using morphological analysis and TF-IDF.

        Args:
            body: Note text to extract keywords from
            top_k: Number of top keywords to return (default: 5)

        Returns:
            List of (keyword, score) tuples, sorted by score descending
        """
        if not body or not body.strip():
            return []

        try:
            # Morphological analysis
            logger.debug(f"Analyzing text: {body[:50]}...")
            result = self.kiwi.analyze(body)

            # Extract valid words with POS tags
            valid_words = []
            for token_result in result:
                for token, pos, _, _ in token_result[0]:
                    if self._is_valid_keyword(token, pos):
                        valid_words.append(token)

            if not valid_words:
                logger.debug("No valid keywords found after filtering")
                return []

            # Calculate TF scores
            tf_scores = self._calculate_tf(valid_words)

            # Calculate TF-IDF scores
            tfidf_scores = {}
            for word, tf in tf_scores.items():
                idf = self._calculate_idf(word)
                tfidf_scores[word] = tf * idf

            # Sort by score and get top K
            sorted_keywords = sorted(tfidf_scores.items(), key=lambda x: x[1], reverse=True)
            top_keywords = sorted_keywords[:top_k]

            logger.debug(f"Extracted {len(top_keywords)} keywords: {[kw for kw, _ in top_keywords]}")
            return top_keywords

        except Exception as e:
            logger.error(f"Error extracting keywords: {e}", exc_info=True)
            return []

    def extract_keyword_names(self, body: str, top_k: int = 5) -> List[str]:
        """
        Extract keyword names only (without scores).

        Args:
            body: Note text to extract keywords from
            top_k: Number of top keywords to return (default: 5)

        Returns:
            List of keyword strings
        """
        keywords = self.extract_keywords(body, top_k)
        return [word for word, _ in keywords]

    def get_stopwords(self) -> Set[str]:
        """
        Get the current set of stopwords.

        Returns:
            Set of stopwords
        """
        return self.stopwords.copy()

    def add_stopwords(self, words: List[str]) -> None:
        """
        Add custom stopwords.

        Args:
            words: List of words to add to stopwords
        """
        self.stopwords.update(word.lower() for word in words)
        logger.info(f"Added {len(words)} custom stopwords")

    def remove_stopwords(self, words: List[str]) -> None:
        """
        Remove words from stopwords.

        Args:
            words: List of words to remove from stopwords
        """
        for word in words:
            self.stopwords.discard(word.lower())
        logger.info(f"Removed {len(words)} words from stopwords")


# Singleton instance
_keyword_service: KeywordService | None = None


def get_keyword_service() -> KeywordService:
    """
    Get singleton instance of KeywordService.

    Returns:
        Singleton KeywordService instance
    """
    global _keyword_service
    if _keyword_service is None:
        _keyword_service = KeywordService()
    return _keyword_service
