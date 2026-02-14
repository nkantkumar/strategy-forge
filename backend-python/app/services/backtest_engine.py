"""Pillar 4: Backtesting engine."""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd


@dataclass
class Trade:
    """Single trade record."""
    entry_date: Any
    exit_date: Any
    entry_price: float
    exit_price: float
    shares: int
    pnl: float
    return_pct: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "entry_date": str(self.entry_date),
            "exit_date": str(self.exit_date),
            "entry_price": self.entry_price,
            "exit_price": self.exit_price,
            "shares": self.shares,
            "pnl": self.pnl,
            "return_pct": self.return_pct,
        }


class BacktestEngine:
    """Vectorized-style backtest with slippage and commission."""

    def __init__(
        self,
        initial_capital: float = 100_000,
        commission: float = 0.001,
        slippage: float = 0.0005,
    ) -> None:
        self.initial_capital = initial_capital
        self.commission = commission
        self.slippage = slippage
        self.trades: list[Trade] = []
        self.equity_curve: list[float] = []

    def run_backtest(
        self,
        strategy: dict[str, Any],
        market_data: pd.DataFrame,
        sentiment_data: pd.DataFrame | None = None,
    ) -> dict[str, Any]:
        """Run backtest; market_data must have Close and indicators."""
        self.trades = []
        data = market_data.copy()
        data.columns = [c.lower() for c in data.columns]
        if sentiment_data is not None and not sentiment_data.empty:
            sentiment_data = sentiment_data.copy()
            sentiment_data.columns = [c.lower() for c in sentiment_data.columns]
            if "sentiment" in sentiment_data.columns:
                data = data.join(sentiment_data[["sentiment"]], how="left")
                data["sentiment"] = data["sentiment"].ffill()
        if "sentiment" not in data.columns:
            data["sentiment"] = 0.5
        data = data.dropna(subset=["close"])
        capital = self.initial_capital
        position: dict[str, Any] | None = None
        equity = [capital]

        for i in range(1, len(data)):
            current = data.iloc[i]
            prev = data.iloc[i - 1]
            try:
                if position is None and self._check_entry(current, prev, strategy):
                    position = self._enter_position(current, capital, strategy)
                    capital -= position["cost"]
                elif position is not None and self._check_exit(current, prev, strategy, position):
                    trade = self._exit_position(current, position)
                    self.trades.append(trade)
                    capital += trade.pnl + position["cost"]
                    position = None
            except Exception:
                pass
            if position is not None:
                unrealized = (current["close"] - position["entry_price"]) * position["shares"]
                equity.append(capital + position["cost"] + unrealized)
            else:
                equity.append(capital)

        self.equity_curve = equity
        metrics = self._calculate_metrics(equity, data)
        return {
            "metrics": metrics,
            "trades": [t.to_dict() for t in self.trades],
            "equity_curve": equity,
            "strategy": strategy,
        }

    def _check_entry(self, current: pd.Series, prev: pd.Series, strategy: dict) -> bool:
        # Entry when ANY rule is true (OR logic) so multiple signals can trigger trades
        rules = strategy.get("entry_rules", [])
        if not rules:
            return False
        for rule in rules:
            if self._evaluate_rule(rule, current, prev):
                return True
        return False

    def _check_exit(self, current: pd.Series, prev: pd.Series, strategy: dict, position: dict) -> bool:
        if strategy.get("stop_loss"):
            pnl_pct = (current["close"] - position["entry_price"]) / position["entry_price"]
            if pnl_pct <= -float(strategy["stop_loss"]):
                return True
        if strategy.get("take_profit"):
            pnl_pct = (current["close"] - position["entry_price"]) / position["entry_price"]
            if pnl_pct >= float(strategy["take_profit"]):
                return True
        for rule in strategy.get("exit_rules", []):
            if self._evaluate_rule(rule, current, prev):
                return True
        return False

    def _evaluate_rule(self, rule: str, current: pd.Series, prev: pd.Series) -> bool:
        try:
            r = rule.lower()
            # Substitute indicator values; use safe defaults for NaN so eval doesn't break
            for key in ["rsi", "macd", "macd_signal", "macd_diff", "sma_20", "sma_50", "bb_high", "bb_low", "volume_ratio"]:
                if key in r and key in current:
                    val = current[key]
                    if pd.isna(val):
                        val = 50.0 if key == "rsi" else 0.0  # skip entry on invalid data
                    r = re.sub(rf"\b{key}\b", str(float(val)), r, flags=re.I)
            if "sentiment_score" in r:
                s = current.get("sentiment", 0.5)
                s = 0.5 if pd.isna(s) else float(s)
                r = r.replace("sentiment_score", str(s))
            return bool(eval(r))
        except Exception:
            return False

    def _enter_position(self, current: pd.Series, capital: float, strategy: dict) -> dict:
        alloc = strategy.get("asset_allocation", {}) or {}
        size = float(alloc.get("max_position_size", 0.2))
        position_value = capital * size
        entry_price = current["close"] * (1 + self.slippage)
        shares = int(position_value / entry_price)
        if shares <= 0:
            shares = 1
        cost = shares * entry_price * (1 + self.commission)
        return {
            "entry_date": current.name,
            "entry_price": entry_price,
            "shares": shares,
            "cost": cost,
        }

    def _exit_position(self, current: pd.Series, position: dict) -> Trade:
        exit_price = current["close"] * (1 - self.slippage)
        gross = position["shares"] * exit_price
        net = gross * (1 - self.commission)
        pnl = net - position["cost"]
        ret_pct = pnl / position["cost"]
        return Trade(
            entry_date=position["entry_date"],
            exit_date=current.name,
            entry_price=position["entry_price"],
            exit_price=exit_price,
            shares=position["shares"],
            pnl=pnl,
            return_pct=ret_pct,
        )

    def _calculate_metrics(self, equity: list[float], data: pd.DataFrame) -> dict[str, Any]:
        eq = pd.Series(equity)
        returns = eq.pct_change().dropna()
        total_return = (equity[-1] / equity[0]) - 1 if equity[0] else 0
        years = max(len(data) / 252, 1 / 252)
        annual_return = (1 + total_return) ** (1 / years) - 1
        sharpe = (returns.mean() / returns.std() * np.sqrt(252)) if returns.std() and returns.std() > 0 else 0.0
        cummax = eq.cummax()
        drawdown = (eq - cummax) / cummax.replace(0, np.nan)
        max_dd = drawdown.min() if len(drawdown) else 0.0
        wins = [t for t in self.trades if t.pnl > 0]
        win_rate = len(wins) / len(self.trades) if self.trades else 0.0
        gross_profit = sum(t.pnl for t in self.trades if t.pnl > 0)
        gross_loss = abs(sum(t.pnl for t in self.trades if t.pnl < 0))
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0.0
        avg_trade = np.mean([t.pnl for t in self.trades]) if self.trades else 0.0
        return {
            "total_return": float(total_return),
            "annual_return": float(annual_return),
            "sharpe_ratio": float(sharpe),
            "max_drawdown": float(max_dd),
            "win_rate": float(win_rate),
            "profit_factor": float(profit_factor),
            "total_trades": len(self.trades),
            "avg_trade": float(avg_trade),
            "final_equity": float(equity[-1]),
        }
