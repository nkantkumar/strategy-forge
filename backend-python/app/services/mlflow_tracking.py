"""Pillar 5: MLflow experiment tracking."""
from __future__ import annotations

from typing import Any


def get_top_strategies_from_mlflow(
    experiment_name: str = "trading_strategies",
    tracking_uri: str | None = None,
    limit: int = 10,
    order_by_metric: str = "sharpe_ratio",
) -> list[dict[str, Any]]:
    """Query MLflow for top runs by metric; return list of strategy summaries."""
    try:
        import mlflow
        from mlflow.tracking import MlflowClient
        if tracking_uri:
            mlflow.set_tracking_uri(tracking_uri)
        client = MlflowClient(tracking_uri=tracking_uri)
        exp = client.get_experiment_by_name(experiment_name)
        if exp is None:
            return []
        runs = client.search_runs(
            experiment_ids=[exp.experiment_id],
            order_by=[f"metrics.{order_by_metric} DESC"],
            max_results=limit,
        )
        if not runs:
            return []
        out = []
        for r in runs:
            params = r.data.params
            metrics = r.data.metrics
            out.append({
                "run_id": r.info.run_id,
                "name": params.get("strategy_name", "Unnamed"),
                "position_sizing": params.get("position_sizing", ""),
                "max_positions": params.get("max_positions", 5),
                "sharpe_ratio": metrics.get("sharpe_ratio"),
                "total_return": metrics.get("total_return"),
                "annual_return": metrics.get("annual_return"),
                "max_drawdown": metrics.get("max_drawdown"),
                "win_rate": metrics.get("win_rate"),
                "profit_factor": metrics.get("profit_factor"),
                "total_trades": metrics.get("total_trades"),
            })
        return out
    except Exception:
        return []


class StrategyTracker:
    """Log strategies and backtest results to MLflow."""

    def __init__(self, experiment_name: str = "trading_strategies", tracking_uri: str | None = None) -> None:
        try:
            import mlflow
            if tracking_uri:
                mlflow.set_tracking_uri(tracking_uri)
            mlflow.set_experiment(experiment_name)
            self._mlflow = mlflow
            self._active = True
        except Exception:
            self._mlflow = None
            self._active = False

    def log_strategy(
        self,
        strategy: dict[str, Any],
        backtest_results: dict[str, Any],
        model_artifacts: dict[str, str] | None = None,
    ) -> None:
        """Log strategy params and backtest metrics."""
        if not self._active or self._mlflow is None:
            return
        try:
            with self._mlflow.start_run():
                self._mlflow.log_param("strategy_name", strategy.get("name", ""))
                self._mlflow.log_param("position_sizing", strategy.get("position_sizing", ""))
                self._mlflow.log_param("max_positions", strategy.get("max_positions", 5))
                self._mlflow.log_param("stop_loss", strategy.get("stop_loss", ""))
                self._mlflow.log_param("take_profit", strategy.get("take_profit", ""))
                metrics = backtest_results.get("metrics", {})
                self._mlflow.log_metric("total_return", metrics.get("total_return", 0))
                self._mlflow.log_metric("annual_return", metrics.get("annual_return", 0))
                self._mlflow.log_metric("sharpe_ratio", metrics.get("sharpe_ratio", 0))
                self._mlflow.log_metric("max_drawdown", metrics.get("max_drawdown", 0))
                self._mlflow.log_metric("win_rate", metrics.get("win_rate", 0))
                self._mlflow.log_metric("profit_factor", metrics.get("profit_factor", 0))
                self._mlflow.log_metric("total_trades", metrics.get("total_trades", 0))
                if model_artifacts:
                    for name, path in model_artifacts.items():
                        self._mlflow.log_artifact(path, name)
        except Exception:
            pass
