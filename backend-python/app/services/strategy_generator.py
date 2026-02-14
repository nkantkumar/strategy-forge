"""Pillar 3: RAG + LLM strategy generation."""
from __future__ import annotations

import json
import re
from typing import Any

import numpy as np
import pandas as pd

from app.config import Settings
from app.services.vector_db import StrategyKnowledgeBase


def _detect_market_regime(market_data: pd.DataFrame) -> str:
    """Simple regime detection from returns."""
    if market_data is None or len(market_data) < 60 or "returns" not in market_data.columns:
        return "Unknown"
    returns = market_data["returns"].tail(60)
    avg_return = returns.mean()
    volatility = returns.std()
    if pd.isna(volatility) or volatility == 0:
        return "Sideways"
    if avg_return > 0 and volatility < returns.rolling(60).std().mean():
        return "Bullish Low Volatility"
    if avg_return > 0:
        return "Bullish High Volatility"
    if avg_return < 0 and volatility < returns.rolling(60).std().mean():
        return "Bearish Low Volatility"
    return "Bearish High Volatility"


def _create_market_context(
    market_data: pd.DataFrame,
    sentiment_data: dict[str, Any],
    technical_indicators: dict[str, Any],
) -> str:
    """Build text context for RAG/LLM."""
    if market_data is None or len(market_data) == 0:
        return "No market data available."
    latest = market_data.iloc[-1]
    close = latest.get("close", latest.get("Close", 0))
    ret_20 = 0.0
    if len(market_data) >= 20 and "close" in market_data.columns:
        ret_20 = ((close / market_data.iloc[-20]["close"]) - 1) * 100
    vol_20 = 0.0
    if "returns" in market_data.columns and len(market_data) >= 20:
        vol_20 = market_data["returns"].tail(20).std() * np.sqrt(252) * 100
    if np.isnan(vol_20):
        vol_20 = 0.0
    return f"""
Market Overview:
- Current Price: ${float(close):.2f}
- 20-day Return: {ret_20:.2f}%
- Volatility (20d): {vol_20:.2f}%
Technical: RSI={technical_indicators.get('rsi', 'N/A')}, MACD={technical_indicators.get('macd', 'N/A')}, BB position={technical_indicators.get('bb_position', 'N/A')}, Volume ratio={technical_indicators.get('volume_ratio', 1)}
Sentiment: compound={sentiment_data.get('compound', 0):.2f}, positive={sentiment_data.get('positive', 0):.2f}, negative={sentiment_data.get('negative', 0):.2f}, articles={sentiment_data.get('article_count', 0)}
Market Regime: {_detect_market_regime(market_data)}
""".strip()


def _parse_strategy(llm_output: str) -> dict[str, Any]:
    """Extract JSON strategy from LLM response."""
    json_str = llm_output
    if "```json" in llm_output:
        json_str = re.search(r"```json\s*([\s\S]*?)```", llm_output)
        if json_str:
            json_str = json_str.group(1).strip()
    elif "```" in llm_output:
        json_str = re.search(r"```\s*([\s\S]*?)```", llm_output)
        if json_str:
            json_str = json_str.group(1).strip()
    return json.loads(json_str)


# Default strategy when LLM is not configured
DEFAULT_STRATEGY = {
    "name": "Momentum-Sentiment Hybrid",
    "description": "Entry on RSI oversold with positive sentiment; exit on RSI overbought or negative sentiment.",
    "entry_rules": [
        "rsi < 30 and sentiment_score > 0.6",
        "macd_diff > 0 and volume_ratio > 1.0",
    ],
    "exit_rules": [
        "rsi > 70 or sentiment_score < 0.3",
    ],
    "position_sizing": "kelly_criterion",
    "max_positions": 5,
    "stop_loss": 0.02,
    "take_profit": 0.05,
    "timeframe": "1d",
    "asset_allocation": {"max_position_size": 0.2, "max_total_exposure": 1.0},
    "filters": ["volume_ratio > 0.5"],
    "rebalance_frequency": "daily",
}


class StrategyGenerator:
    """Generate trading strategy using RAG + optional LLM."""

    def __init__(
        self,
        knowledge_base: StrategyKnowledgeBase | None = None,
        settings: Settings | None = None,
    ) -> None:
        self.settings = settings or Settings()
        self.knowledge_base = knowledge_base or StrategyKnowledgeBase(
            persist_directory=self.settings.chroma_persist_dir
        )
        self._llm = None
        if self.settings.anthropic_api_key:
            try:
                from langchain_anthropic import ChatAnthropic
                from langchain_core.prompts import ChatPromptTemplate
                from langchain_core.output_parsers import StrOutputParser
                self._llm = ChatAnthropic(
                    model="claude-sonnet-4-20250514",
                    temperature=0.7,
                    api_key=self.settings.anthropic_api_key,
                )
                self._prompt = ChatPromptTemplate.from_messages([
                    ("system", "You are an expert quantitative trading strategist. Output only valid JSON."),
                    ("human", """Based on the following, generate a trading strategy as JSON.

Current Market Conditions:
{market_context}

Historical Successful Strategies (reference):
{historical_strategies}

Risk Tolerance: {risk_tolerance}

Generate a complete strategy with: name, description, entry_rules (list of strings), exit_rules (list), position_sizing, max_positions, stop_loss, take_profit, timeframe, asset_allocation (object with max_position_size, max_total_exposure), filters (list), rebalance_frequency. Use indicator names: rsi, macd, macd_diff, volume_ratio, sentiment_score. Output only the JSON object, no markdown."""),
                ])
                self._chain = self._prompt | self._llm | StrOutputParser()
            except Exception:
                self._llm = None

    def generate_strategy(
        self,
        market_data: pd.DataFrame,
        sentiment_data: dict[str, Any],
        technical_indicators: dict[str, Any],
        risk_tolerance: str = "medium",
    ) -> dict[str, Any]:
        """Generate strategy via RAG + LLM or return template."""
        market_context = _create_market_context(market_data, sentiment_data, technical_indicators)
        similar = self.knowledge_base.retrieve_similar_strategies(market_context, k=5)
        historical_str = json.dumps([{"content": s["content"], "metadata": s["metadata"]} for s in similar], indent=2)

        if self._llm is not None and self._chain is not None:
            try:
                result = self._chain.invoke({
                    "market_context": market_context,
                    "historical_strategies": historical_str,
                    "risk_tolerance": risk_tolerance,
                })
                return _parse_strategy(result)
            except Exception:
                pass
        # Fallback: return default strategy with regime-aware name
        regime = _detect_market_regime(market_data)
        strategy = dict(DEFAULT_STRATEGY)
        strategy["name"] = f"Momentum-Sentiment Hybrid ({regime})"
        strategy["market_regime"] = regime
        return strategy
