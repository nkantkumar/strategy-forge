"""Pillar 1: News data ingestion (NewsAPI)."""
from __future__ import annotations

from typing import Any

import httpx
from app.config import Settings


class NewsService:
    """Fetch news articles for sentiment."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or Settings()
        self.base_url = "https://newsapi.org/v2"

    async def fetch_news(
        self,
        query: str,
        from_date: str,
        to_date: str,
        language: str = "en",
        page_size: int = 20,
    ) -> list[dict[str, Any]]:
        """Fetch news articles for a query and date range."""
        if not self.settings.news_api_key:
            return []
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                f"{self.base_url}/everything",
                params={
                    "q": query,
                    "from": from_date,
                    "to": to_date,
                    "sortBy": "relevancy",
                    "language": language,
                    "pageSize": page_size,
                    "apiKey": self.settings.news_api_key,
                },
            )
            r.raise_for_status()
            data = r.json()
        articles = data.get("articles", [])
        return [
            {
                "title": a.get("title") or "",
                "description": a.get("description") or "",
                "content": a.get("content") or "",
                "published_at": a.get("publishedAt") or "",
                "source": (a.get("source") or {}).get("name", ""),
            }
            for a in articles
        ]
