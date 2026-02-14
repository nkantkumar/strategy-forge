"""Pillar 2: Technical feature extraction."""
from __future__ import annotations

import numpy as np
import pandas as pd
from ta.momentum import RSIIndicator
from ta.trend import MACD, SMAIndicator
from ta.volatility import BollingerBands


class TechnicalFeatures:
    """Compute technical indicators for strategy and backtest."""

    @staticmethod
    def calculate_all_features(df: pd.DataFrame) -> pd.DataFrame:
        """Calculate technical indicators. Expects columns: Open, High, Low, Close, Volume (case-insensitive)."""
        df = df.copy()
        # Normalize column names
        col_map = {c: c.lower() for c in df.columns}
        df = df.rename(columns=col_map)
        if "close" not in df.columns:
            raise ValueError("DataFrame must contain 'Close' column")
        close = df["close"]
        volume = df["volume"] if "volume" in df.columns else pd.Series(1.0, index=df.index)

        # Returns
        df["returns"] = close.pct_change()
        df["log_returns"] = np.log(close / close.shift(1))

        # Momentum
        rsi = RSIIndicator(close=close)
        df["rsi"] = rsi.rsi()
        macd = MACD(close=close)
        df["macd"] = macd.macd()
        df["macd_signal"] = macd.macd_signal()
        df["macd_diff"] = macd.macd_diff()

        # Trend
        sma_20 = SMAIndicator(close=close, window=20)
        sma_50 = SMAIndicator(close=close, window=50)
        df["sma_20"] = sma_20.sma_indicator()
        df["sma_50"] = sma_50.sma_indicator()

        # Volatility
        bb = BollingerBands(close=close)
        df["bb_high"] = bb.bollinger_hband()
        df["bb_low"] = bb.bollinger_lband()
        df["bb_mid"] = bb.bollinger_mavg()
        df["bb_width"] = df["bb_high"] - df["bb_low"]

        # Volume
        vol_sma = volume.rolling(window=20).mean()
        df["volume_sma"] = vol_sma
        df["volume_ratio"] = volume / vol_sma.replace(0, np.nan)

        # Price position in BB
        bb_range = df["bb_high"] - df["bb_low"]
        df["price_position"] = (close - df["bb_low"]) / bb_range.replace(0, np.nan)

        return df
