"""
AI-powered auto-tagging for documents.
Suggests tags based on document content using the configured AI provider.
"""
import os
import httpx
import json
from typing import List


async def auto_tag_document(content_text: str, existing_tags: List[str] = None) -> List[str]:
    """
    Analyze document content and suggest relevant tags.
    Uses Gemini/OpenRouter/Ollama chain with keyword fallback.
    """
    if not content_text or len(content_text.strip()) < 50:
        return ["general"]

    # Truncate content for analysis
    sample = content_text[:2000]

    prompt = f"""Analyze this document and suggest 3-5 relevant tags.
Return ONLY a JSON array of tag names (lowercase, no spaces, use hyphens for multi-word).
Focus on: topic, category, format, urgency, domain.

Existing tags to consider: {existing_tags or []}

Document content:
{sample}

Return ONLY a JSON array, nothing else. Example: ["finance", "quarterly-report", "2024"]"""

    tags = await _try_ai_tagging(prompt)
    if tags:
        return tags

    # Fallback: keyword extraction
    return _keyword_extract(content_text)


async def _try_ai_tagging(prompt: str) -> List[str]:
    """Try AI providers in chain for tagging."""
    # Try Gemini
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}",
                    json={"contents": [{"parts": [{"text": prompt}]}]},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    return _parse_tags(text)
        except Exception:
            pass

    # Try OpenRouter
    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    if openrouter_key:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openrouter_key}"},
                    json={
                        "model": "qwen/qwen3-8b",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    return _parse_tags(text)
        except Exception:
            pass

    # Try Ollama
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "http://localhost:11434/api/generate",
                json={"model": "qwen2.5", "prompt": prompt, "stream": False},
            )
            if resp.status_code == 200:
                text = resp.json().get("response", "")
                return _parse_tags(text)
    except Exception:
        pass

    return []


def _parse_tags(text: str) -> List[str]:
    """Parse AI response to extract tag array."""
    try:
        # Find JSON array in response
        start = text.find("[")
        end = text.rfind("]") + 1
        if start >= 0 and end > start:
            tags = json.loads(text[start:end])
            if isinstance(tags, list):
                return [str(t).lower().strip()[:50] for t in tags if t][:7]
    except Exception:
        pass
    return []


def _keyword_extract(text: str) -> List[str]:
    """Simple keyword-based tagging fallback."""
    import re
    from collections import Counter

    text_lower = text.lower()
    words = re.findall(r'\b[a-z]{4,}\b', text_lower)

    # Common filler words to skip
    stopwords = {
        "this", "that", "with", "from", "have", "been", "were", "they", "their",
        "about", "would", "could", "should", "there", "which", "these", "those",
        "than", "them", "then", "some", "what", "when", "where", "will", "each",
        "into", "also", "your", "only", "other", "more", "very", "just", "like",
    }

    filtered = [w for w in words if w not in stopwords]
    common = Counter(filtered).most_common(5)
    return [word for word, _ in common] if common else ["general"]
