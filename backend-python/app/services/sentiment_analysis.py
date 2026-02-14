"""Pillar 2: Sentiment analysis (FinBERT optional; fallback to rule-based)."""
from __future__ import annotations

from typing import Any

import numpy as np


def _rule_based_sentiment(text: str) -> dict[str, float]:
    """Simple rule-based sentiment when FinBERT not available."""
    text_lower = (text or "").lower()
    positive = sum(1 for w in ["surge", "gain", "rise", "bull", "growth", "beat", "profit"] if w in text_lower)
    negative = sum(1 for w in ["fall", "drop", "loss", "bear", "decline", "miss", "cut"] if w in text_lower)
    total = positive + negative + 1e-6
    pos_score = positive / total
    neg_score = negative / total
    return {
        "positive": float(pos_score),
        "negative": float(neg_score),
        "neutral": float(1 - pos_score - neg_score),
        "compound": float(pos_score - neg_score),
    }


class FinancialSentimentAnalyzer:
    """Analyze financial text sentiment. Uses FinBERT if available else rule-based."""

    def __init__(self, use_finbert: bool = False) -> None:
        self._model = None
        self._tokenizer = None
        self._use_finbert = use_finbert
        if use_finbert:
            try:
                from transformers import AutoModelForSequenceClassification, AutoTokenizer
                import torch
                self._tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
                self._model = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert")
                self._model.eval()
                self._torch = torch
            except Exception:
                self._use_finbert = False

    def analyze_sentiment(self, text: str) -> dict[str, float]:
        """Single text sentiment."""
        if self._use_finbert and self._model is not None:
            inputs = self._tokenizer(
                text[:2000],
                return_tensors="pt",
                truncation=True,
                max_length=512,
            )
            with self._torch.no_grad():
                out = self._model(**inputs)
                probs = self._torch.nn.functional.softmax(out.logits, dim=-1)
            scores = probs[0].tolist()
            return {
                "positive": scores[0],
                "negative": scores[1],
                "neutral": scores[2],
                "compound": scores[0] - scores[1],
            }
        return _rule_based_sentiment(text)

    def analyze_batch(self, texts: list[str]) -> list[dict[str, float]]:
        """Batch sentiment."""
        return [self.analyze_sentiment(t) for t in texts]

    def aggregate_news_sentiment(self, news_articles: list[dict[str, Any]]) -> dict[str, float]:
        """Aggregate sentiment from news list (each has title, description)."""
        if not news_articles:
            return {"positive": 0.33, "negative": 0.33, "neutral": 0.34, "compound": 0.0, "article_count": 0}
        sentiments = [
            self.analyze_sentiment(f"{a.get('title', '')}. {a.get('description', '')}")
            for a in news_articles
        ]
        return {
            "positive": float(np.mean([s["positive"] for s in sentiments])),
            "negative": float(np.mean([s["negative"] for s in sentiments])),
            "neutral": float(np.mean([s["neutral"] for s in sentiments])),
            "compound": float(np.mean([s["compound"] for s in sentiments])),
            "article_count": len(sentiments),
        }
