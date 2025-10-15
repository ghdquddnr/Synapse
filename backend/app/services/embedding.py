"""
Embedding generation service using multilingual-e5-large model.

This service generates 1024-dimensional embeddings for note text,
optimized for semantic similarity search and recommendations.
"""

import re
from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer

from ..core.logging import get_logger

logger = get_logger(__name__)


class EmbeddingService:
    """Service for generating text embeddings using multilingual-e5-large model."""

    def __init__(self):
        """Initialize the embedding model."""
        logger.info("Loading multilingual-e5-large model...")
        self.model = SentenceTransformer("intfloat/multilingual-e5-large")
        self.embedding_dim = 1024
        self.max_length = 512  # Model's max sequence length
        logger.info("Embedding model loaded successfully")

    def preprocess_text(self, body: str) -> str:
        """
        Preprocess text before embedding generation.

        Args:
            body: Raw note text

        Returns:
            Preprocessed text suitable for embedding
        """
        if not body or not body.strip():
            return ""

        # Normalize whitespace
        text = re.sub(r"\s+", " ", body.strip())

        # Normalize URLs (replace with placeholder to reduce noise)
        text = re.sub(
            r"http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+",
            "[URL]",
            text,
        )

        # Truncate to max length (approximate token count)
        # Each Korean character ≈ 1.5 tokens, English word ≈ 1 token
        max_chars = self.max_length * 2  # Conservative estimate
        if len(text) > max_chars:
            text = text[:max_chars]
            logger.debug(f"Text truncated from {len(body)} to {len(text)} characters")

        return text

    def augment_short_text(self, body: str) -> str:
        """
        Augment short text with context to improve embedding quality.

        For very short notes (< 10 characters), add contextual prefix
        to help the model understand this is a brief memo.

        Args:
            body: Preprocessed note text

        Returns:
            Augmented text with context
        """
        if not body or not body.strip():
            return ""

        # If text is very short, add context
        if len(body.strip()) < 10:
            return f"짧은 메모: {body}"

        return body

    def generate_embedding(self, body: str) -> np.ndarray:
        """
        Generate embedding for a single text.

        Args:
            body: Note text to embed

        Returns:
            1024-dimensional embedding vector

        Raises:
            ValueError: If body is empty after preprocessing
        """
        # Preprocess text
        text = self.preprocess_text(body)
        if not text:
            raise ValueError("Cannot generate embedding for empty text")

        # Augment short text
        text = self.augment_short_text(text)

        # Generate embedding
        logger.debug(f"Generating embedding for text: {text[:50]}...")
        embedding = self.model.encode(text, convert_to_numpy=True)

        # Verify dimension
        if embedding.shape[0] != self.embedding_dim:
            raise RuntimeError(
                f"Expected embedding dimension {self.embedding_dim}, got {embedding.shape[0]}"
            )

        logger.debug(f"Generated embedding with shape {embedding.shape}")
        return embedding

    def batch_generate_embeddings(self, texts: List[str]) -> List[np.ndarray]:
        """
        Generate embeddings for multiple texts in batch.

        Batch processing is more efficient than individual generation.

        Args:
            texts: List of note texts to embed

        Returns:
            List of 1024-dimensional embedding vectors

        Raises:
            ValueError: If texts list is empty
        """
        if not texts:
            raise ValueError("Cannot generate embeddings for empty list")

        # Preprocess all texts
        processed_texts = []
        for text in texts:
            preprocessed = self.preprocess_text(text)
            if not preprocessed:
                # Use placeholder for empty texts
                preprocessed = "빈 메모"
            augmented = self.augment_short_text(preprocessed)
            processed_texts.append(augmented)

        # Batch encode
        logger.info(f"Generating embeddings for {len(processed_texts)} texts...")
        embeddings = self.model.encode(
            processed_texts, convert_to_numpy=True, show_progress_bar=len(texts) > 10
        )

        # Verify dimensions
        if embeddings.shape[1] != self.embedding_dim:
            raise RuntimeError(
                f"Expected embedding dimension {self.embedding_dim}, got {embeddings.shape[1]}"
            )

        logger.info(f"Generated {len(embeddings)} embeddings with shape {embeddings.shape}")
        return [embeddings[i] for i in range(len(embeddings))]


# Singleton instance
_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    """
    Get singleton instance of EmbeddingService.

    Returns:
        Singleton EmbeddingService instance
    """
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
