import { getToken } from '../keycloak'

const API_BASE = '/api/v1'

/** Headers for API calls: Bearer token (Keycloak) when available, else X-API-Key when VITE_API_KEY is set. */
async function apiHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extra }
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json'
  const token = await getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else {
    const key = typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_KEY as string | undefined)
    if (key) headers['X-API-Key'] = key
  }
  return headers
}

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
    headers: await apiHeaders(),
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
    headers: await apiHeaders(),
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
  const res = await fetch(`${API_BASE}/strategies/top?limit=${limit}&order_by=${orderBy}`, { headers: await apiHeaders() })
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export type SignalCheckResponse = {
  entry_matched: boolean
  exit_matched: boolean
  entry_email_sent: boolean
  exit_email_sent: boolean
  message?: string
  current_values?: Record<string, number>
  entry_rules?: string[]
  exit_rules?: string[]
}

export async function checkSignals(strategy: Strategy, symbol: string, emails?: string[]): Promise<SignalCheckResponse> {
  const res = await fetch(`${API_BASE}/signals/check`, {
    method: 'POST',
    headers: await apiHeaders(),
    body: JSON.stringify({ strategy, symbol, emails }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string; error?: string }
    throw new Error(err.detail ?? err.error ?? res.statusText)
  }
  return res.json()
}

export async function health(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`, { headers: await apiHeaders() })
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}
