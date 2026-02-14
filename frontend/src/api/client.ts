const API_BASE = '/api/v1'

export type Strategy = {
  name: string
  description?: string
  entry_rules: string[]
  exit_rules: string[]
  position_sizing?: string
  max_positions?: number
  stop_loss?: number
  take_profit?: number
  timeframe?: string
  asset_allocation?: { max_position_size?: number; max_total_exposure?: number }
  filters?: string[]
  rebalance_frequency?: string
  [k: string]: unknown
}

export type GenerateRequest = {
  symbol: string
  start_date: string
  end_date: string
  risk_tolerance?: string
}

export type GenerateResponse = {
  strategy_id: string
  strategy: Strategy
  generation_timestamp: string
}

export type BacktestRequest = {
  strategy: Strategy
  symbol: string
  start_date: string
  end_date: string
  initial_capital?: number
}

export type BacktestResponse = {
  backtest_id: string
  metrics: {
    total_return: number
    annual_return: number
    sharpe_ratio: number
    max_drawdown: number
    win_rate: number
    profit_factor: number
    total_trades: number
    avg_trade: number
    final_equity: number
  }
  equity_curve: number[]
  trades: Array<{
    entry_date: string
    exit_date: string
    entry_price: number
    exit_price: number
    shares: number
    pnl: number
    return_pct: number
  }>
}

export async function generateStrategy(req: GenerateRequest): Promise<GenerateResponse> {
  const res = await fetch(`${API_BASE}/strategies/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || res.statusText)
  }
  return res.json()
}

export async function runBacktest(req: BacktestRequest): Promise<BacktestResponse> {
  const res = await fetch(`${API_BASE}/backtest/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string; error?: string; message?: string }
    const msg = err.detail ?? err.error ?? err.message ?? res.statusText
    throw new Error(msg)
  }
  return res.json()
}

export type TopStrategy = {
  run_id?: string
  name: string
  position_sizing?: string
  max_positions?: number
  sharpe_ratio?: number
  total_return?: number
  annual_return?: number
  max_drawdown?: number
  win_rate?: number
  profit_factor?: number
  total_trades?: number
}

export async function getTopStrategies(limit = 10, orderBy = 'sharpe_ratio'): Promise<{ top_strategies: TopStrategy[] }> {
  const res = await fetch(`${API_BASE}/strategies/top?limit=${limit}&order_by=${orderBy}`)
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function health(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`)
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}
