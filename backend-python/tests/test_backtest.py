"""Minimal backtest engine test."""
import numpy as np
import pandas as pd
from app.services.backtest_engine import BacktestEngine


def test_backtest_engine_run():
    """Run backtest on synthetic data."""
    n = 100
    dates = pd.date_range("2020-01-01", periods=n, freq="B")
    data = pd.DataFrame(
        {
            "close": 100 + pd.Series(range(n)).cumsum() * 0.1 + (np.random.randn(n).cumsum() * 2),
            "volume": 1_000_000,
        },
        index=dates,
    )
    data.index.name = "date"
    strategy = {
        "name": "Test",
        "entry_rules": ["rsi < 35"],
        "exit_rules": ["rsi > 65"],
        "stop_loss": 0.02,
        "take_profit": 0.05,
        "asset_allocation": {"max_position_size": 0.2},
    }
    from app.services.feature_engineering import TechnicalFeatures
    tech = TechnicalFeatures()
    data = tech.calculate_all_features(data)
    sentiment = pd.DataFrame({"sentiment": [0.5] * len(data)}, index=data.index)
    engine = BacktestEngine(initial_capital=100_000)
    result = engine.run_backtest(strategy, data, sentiment)
    assert "metrics" in result
    assert "equity_curve" in result
    assert result["metrics"]["total_trades"] >= 0
    assert result["metrics"]["final_equity"] >= 0
