"""Check if strategy entry/exit conditions match on latest data (for alerts)."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Tuple

import pandas as pd

from app.services.backtest_engine import BacktestEngine
from app.services.feature_engineering import TechnicalFeatures
from app.services.market_data import MarketDataService

# Indicator keys used in rule evaluation (exposed for API/frontend)
INDICATOR_KEYS = [
    "rsi", "macd", "macd_signal", "macd_diff",
    "sma_20", "sma_50", "bb_high", "bb_low", "volume_ratio", "close",
]


async def check_entry_exit_signals(
    strategy: dict[str, Any],
    symbol: str,
    days_lookback: int = 60,
) -> Tuple[bool, bool, dict[str, Any]]:
    """
    Fetch recent data, compute features, and check if entry/exit conditions
    match on the latest bar. Returns (entry_matched, exit_matched, current_values).
    """
    empty_values: dict[str, Any] = {}
    market_svc = MarketDataService()
    end = datetime.utcnow()
    start = (end - timedelta(days=days_lookback)).strftime("%Y-%m-%d")
    end_str = end.strftime("%Y-%m-%d")
    raw = await market_svc.fetch_ohlcv(symbol, start, end_str)
    if not raw["data"]:
        return False, False, empty_values
    df = pd.DataFrame(raw["data"])
    if "Date" in df.columns:
        df = df.set_index("Date")
    elif "date" in df.columns:
        df = df.set_index("date")
    df.index = pd.to_datetime(df.index)
    tech = TechnicalFeatures()
    data = tech.calculate_all_features(df)
    data.columns = [c.lower() for c in data.columns]
    if "sentiment" not in data.columns:
        data["sentiment"] = 0.5
    data = data.dropna(subset=["close"])
    if len(data) < 2:
        return False, False, empty_values
    current = data.iloc[-1]
    prev = data.iloc[-2]
    engine = BacktestEngine()
    entry_matched = engine._check_entry(current, prev, strategy)
    dummy_position = {"entry_price": float(current["close"])}
    exit_matched = engine._check_exit(current, prev, strategy, dummy_position)
    # Build current values for frontend (only include keys that exist and are numeric)
    s = current.get("sentiment", 0.5)
    current_values: dict[str, Any] = {"sentiment_score": round(float(s), 4) if pd.notna(s) else 0.5}
    for key in INDICATOR_KEYS:
        if key in current.index:
            val = current[key]
            if pd.notna(val):
                try:
                    current_values[key] = round(float(val), 4)
                except (TypeError, ValueError):
                    pass
    return entry_matched, exit_matched, current_values
