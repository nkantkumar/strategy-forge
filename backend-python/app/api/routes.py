"""Pillar 6: FastAPI routes - strategy generation, backtest, top strategies."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import Settings
from app.services.backtest_engine import BacktestEngine
from app.services.feature_engineering import TechnicalFeatures
from app.services.market_data import MarketDataService
from app.services.mlflow_tracking import StrategyTracker, get_top_strategies_from_mlflow
from app.services.news_data import NewsService
from app.services.sentiment_analysis import FinancialSentimentAnalyzer
from app.services.strategy_generator import StrategyGenerator
from app.services.vector_db import StrategyKnowledgeBase

router = APIRouter(prefix="/api/v1", tags=["trading"])


class StrategyGenerationRequest(BaseModel):
    symbol: str
    start_date: str
    end_date: str
    risk_tolerance: str = "medium"
    market_conditions: dict[str, Any] | None = None


class BacktestRequest(BaseModel):
    strategy: dict[str, Any]
    symbol: str
    start_date: str
    end_date: str
    initial_capital: float = 100_000


@router.post("/strategies/generate")
async def generate_strategy(req: StrategyGenerationRequest) -> dict[str, Any]:
    """Generate a trading strategy using data + RAG + optional LLM."""
    settings = Settings()
    market_svc = MarketDataService()
    raw = await market_svc.fetch_ohlcv(req.symbol, req.start_date, req.end_date)
    if not raw["data"]:
        raise HTTPException(status_code=400, detail="No market data for symbol/date range")
    df = pd.DataFrame(raw["data"])
    if "Date" in df.columns:
        df = df.set_index("Date")
    elif "date" in df.columns:
        df = df.set_index("date")
    df.index = pd.to_datetime(df.index)
    tech = TechnicalFeatures()
    data_with_features = tech.calculate_all_features(df)

    news_svc = NewsService(settings)
    news = await news_svc.fetch_news(query=req.symbol, from_date=req.start_date, to_date=req.end_date)
    sentiment_analyzer = FinancialSentimentAnalyzer(use_finbert=False)
    sentiment = sentiment_analyzer.aggregate_news_sentiment(news)

    kb = StrategyKnowledgeBase(settings.chroma_persist_dir)
    generator = StrategyGenerator(knowledge_base=kb, settings=settings)
    latest = data_with_features.iloc[-1]
    tech_indicators = {
        "rsi": latest.get("rsi"),
        "macd": latest.get("macd"),
        "bb_position": latest.get("price_position"),
        "volume_ratio": latest.get("volume_ratio"),
    }
    strategy = generator.generate_strategy(
        market_data=data_with_features,
        sentiment_data=sentiment,
        technical_indicators=tech_indicators,
        risk_tolerance=req.risk_tolerance,
    )
    return {
        "strategy_id": str(uuid.uuid4()),
        "strategy": strategy,
        "generation_timestamp": datetime.utcnow().isoformat() + "Z",
    }


@router.post("/backtest/run")
async def run_backtest(req: BacktestRequest) -> dict[str, Any]:
    """Run backtest for a given strategy."""
    market_svc = MarketDataService()
    raw = await market_svc.fetch_ohlcv(req.symbol, req.start_date, req.end_date)
    if not raw["data"]:
        raise HTTPException(status_code=400, detail="No market data")
    df = pd.DataFrame(raw["data"])
    if "Date" in df.columns:
        df = df.set_index("Date")
    elif "date" in df.columns:
        df = df.set_index("date")
    df.index = pd.to_datetime(df.index)
    tech = TechnicalFeatures()
    data_with_features = tech.calculate_all_features(df)
    sentiment_df = pd.DataFrame(
        {"sentiment": [0.5] * len(data_with_features)},
        index=data_with_features.index,
    )
    engine = BacktestEngine(initial_capital=req.initial_capital)
    results = engine.run_backtest(
        strategy=req.strategy,
        market_data=data_with_features,
        sentiment_data=sentiment_df,
    )
    settings = Settings()
    tracker = StrategyTracker(tracking_uri=settings.mlflow_tracking_uri)
    tracker.log_strategy(req.strategy, results)
    return {
        "backtest_id": str(uuid.uuid4()),
        "metrics": results["metrics"],
        "equity_curve": results["equity_curve"],
        "trades": results["trades"],
    }


@router.get("/strategies/top")
async def get_top_strategies(limit: int = 10, order_by: str = "sharpe_ratio") -> dict[str, Any]:
    """Return top strategies from MLflow (runs logged from backtests)."""
    settings = Settings()
    strategies = get_top_strategies_from_mlflow(
        tracking_uri=settings.mlflow_tracking_uri,
        limit=min(limit, 50),
        order_by_metric=order_by if order_by in ("sharpe_ratio", "total_return", "win_rate") else "sharpe_ratio",
    )
    return {"top_strategies": strategies}


@router.post("/optimize/strategy")
async def optimize_strategy(strategy: dict[str, Any], target_metric: str = "sharpe_ratio") -> dict[str, Any]:
    """Placeholder: optimize strategy parameters."""
    return {"optimized_strategy": strategy, "target_metric": target_metric}


@router.get("/health")
async def health() -> dict[str, str]:
    """Health check."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat() + "Z"}
