"""
TF-IDF based embedding + cosine similarity search.
No external dependencies (no sentence-transformers, no pgvector).
Works on Render free tier.
"""

import math
import re
from collections import Counter
from typing import List, Tuple


def tokenize(text: str) -> List[str]:
    """Lowercase, strip punctuation, split into tokens."""
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text.split() if text else []


def tfidf_vector(tokens: List[str], idf: dict) -> dict:
    """Compute TF-IDF vector for a list of tokens."""
    tf = Counter(tokens)
    total = len(tokens) if tokens else 1
    return {term: (count / total) * idf.get(term, 1.0) for term, count in tf.items()}


def cosine_sim(a: dict, b: dict) -> float:
    """Cosine similarity between two sparse vectors."""
    common = set(a.keys()) & set(b.keys())
    if not common:
        return 0.0
    dot = sum(a[k] * b[k] for k in common)
    norm_a = math.sqrt(sum(v * v for v in a.values()))
    norm_b = math.sqrt(sum(v * v for v in b.values()))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class TFIDFIndex:
    """In-memory TF-IDF index for document chunks."""

    def __init__(self):
        self.docs: dict[int, List[str]] = {}  # chunk_id -> tokens
        self.idf: dict[str, float] = {}
        self.vectors: dict[int, dict] = {}
        self._dirty = True

    def add(self, chunk_id: int, text: str):
        tokens = tokenize(text)
        self.docs[chunk_id] = tokens
        self._dirty = True

    def remove(self, chunk_id: int):
        self.docs.pop(chunk_id, None)
        self.vectors.pop(chunk_id, None)
        self._dirty = True

    def _rebuild(self):
        if not self._dirty and self.idf:
            return
        # Compute IDF
        n_docs = len(self.docs)
        if n_docs == 0:
            self.idf = {}
            self.vectors = {}
            return

        df = Counter()
        for tokens in self.docs.values():
            df.update(set(tokens))

        self.idf = {
            term: math.log((n_docs + 1) / (count + 1)) + 1
            for term, count in df.items()
        }

        # Compute vectors
        self.vectors = {
            chunk_id: tfidf_vector(tokens, self.idf)
            for chunk_id, tokens in self.docs.items()
        }
        self._dirty = False

    def search(self, query: str, top_k: int = 5) -> List[Tuple[int, float]]:
        """Search index, return [(chunk_id, score), ...] sorted by relevance."""
        self._rebuild()
        if not self.vectors:
            return []

        q_tokens = tokenize(query)
        q_vec = tfidf_vector(q_tokens, self.idf)

        scored = [
            (chunk_id, cosine_sim(q_vec, vec))
            for chunk_id, vec in self.vectors.items()
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    def clear(self):
        self.docs.clear()
        self.idf.clear()
        self.vectors.clear()
        self._dirty = True


# Global singleton — rebuilt on startup from DB
_index = TFIDFIndex()


def get_index() -> TFIDFIndex:
    return _index


def rebuild_index(db_session):
    """Rebuild the TF-IDF index from all document chunks in DB."""
    from models import DocumentChunk
    _index.clear()
    chunks = db_session.query(DocumentChunk).all()
    for chunk in chunks:
        _index.add(chunk.id, chunk.content)
    _index._dirty = True
    _index._rebuild()
    return len(chunks)
