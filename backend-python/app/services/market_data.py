"""Pillar 1: Market data ingestion (Yahoo Finance)."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import pandas as pd
import yfinance as yf


class MarketDataService:
    """Fetch OHLCV and multi-symbol data."""

    def __init__(self) -> None:
        self._cache: dict[str, Any] = {}

    async def fetch_ohlcv(
        self,
        symbol: str,
        start_date: str,
        end_date: str,
    ) -> dict[str, Any]:
        """Fetch OHLCV for one symbol."""
        ticker = yf.Ticker(symbol)
        data = ticker.history(start=start_date, end=end_date)
        if data.empty:
            return {
                "symbol": symbol,
                "data": [],
                "metadata": {"rows": 0, "start": start_date, "end": end_date},
            }
        # Ensure column names for downstream
        data = data.rename(columns=str.lower)
        records = data.reset_index().to_dict("records")
        for r in records:
            if "date" in r and hasattr(r["date"], "isoformat"):
                r["date"] = r["date"].isoformat()
        return {
            "symbol": symbol,
            "data": records,
            "metadata": {
                "rows": len(data),
                "start": start_date,
                "end": end_date,
            },
        }

    async def fetch_multiple_symbols(
        self,
        symbols: list[str],
        start_date: str,
        end_date: str,
    ) -> pd.DataFrame:
        """Fetch data for multiple symbols."""
        return yf.download(symbols, start=start_date, end=end_date, group_by="ticker", progress=False)
