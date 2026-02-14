import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { runBacktest, type Strategy } from '../api/client'

const defaultStart = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().slice(0, 10)
}
const defaultEnd = () => new Date().toISOString().slice(0, 10)

const defaultStrategy: Strategy = {
  name: 'Momentum-Sentiment Hybrid',
  entry_rules: ['rsi < 35', 'macd_diff > 0 and volume_ratio > 1.0'],
  exit_rules: ['rsi > 70 or sentiment_score < 0.3'],
  position_sizing: 'kelly_criterion',
  max_positions: 5,
  stop_loss: 0.02,
  take_profit: 0.05,
  asset_allocation: { max_position_size: 0.2, max_total_exposure: 1.0 },
}

export default function BacktestPage() {
  const [symbol, setSymbol] = useState('AAPL')
  const [startDate, setStartDate] = useState(defaultStart())
  const [endDate, setEndDate] = useState(defaultEnd())
  const [initialCapital, setInitialCapital] = useState(100_000)
  const [strategyJson, setStrategyJson] = useState(JSON.stringify(defaultStrategy, null, 2))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Awaited<ReturnType<typeof runBacktest>> | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    const today = new Date().toISOString().slice(0, 10)
    if (endDate > today) {
      setError('End date must be today or earlier. Use past dates for historical data.')
      return
    }
    if (startDate > endDate) {
      setError('Start date must be before end date.')
      return
    }
    let strategy: Strategy
    try {
      strategy = JSON.parse(strategyJson) as Strategy
    } catch {
      setError('Invalid strategy JSON')
      return
    }
    setLoading(true)
    try {
      const res = await runBacktest({
        strategy,
        symbol,
        start_date: startDate,
        end_date: endDate,
        initial_capital: initialCapital,
      })
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backtest failed')
    } finally {
      setLoading(false)
    }
  }

  const chartData = result?.equity_curve?.map((v, i) => ({ index: i, value: v })) ?? []

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Backtest</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
        Run a strategy on historical data. Use <strong>past dates</strong> (end date today or earlier). Edit the strategy JSON or use the default.
      </p>
      <form onSubmit={handleSubmit} style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--muted)' }}>Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--muted)' }}>Start</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--muted)' }}>End</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--muted)' }}>Initial capital ($)</label>
            <input type="number" value={initialCapital} onChange={(e) => setInitialCapital(Number(e.target.value))} min={1000} step={1000} style={{ width: 140, padding: '0.5rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }} />
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--muted)' }}>Strategy (JSON)</label>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: 'var(--muted)' }}>Use realistic thresholds: e.g. RSI &lt; 30 (oversold) and RSI &gt; 70 (overbought). RSI &lt; 10 rarely occurs and will yield no trades.</p>
          <textarea
            value={strategyJson}
            onChange={(e) => setStrategyJson(e.target.value)}
            rows={10}
            style={{ width: '100%', padding: '0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
          />
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="submit" disabled={loading} style={{ padding: '0.6rem 1.2rem', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 6, fontWeight: 600 }}>
            {loading ? 'Running…' : 'Run Backtest'}
          </button>
          <button
            type="button"
            onClick={() => setStrategyJson(JSON.stringify(defaultStrategy, null, 2))}
            style={{ padding: '0.6rem 1rem', background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6 }}
          >
            Reset to default strategy
          </button>
        </div>
      </form>
      {error && (
        <div style={{ padding: '1rem', background: 'rgba(242,78,78,0.15)', borderRadius: 'var(--radius)', color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>
      )}
      {result && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0, color: 'var(--accent)' }}>Results</h3>
          {result.metrics.total_trades === 0 && (
            <div style={{ padding: '0.75rem', background: 'rgba(242,184,78,0.15)', borderRadius: 'var(--radius)', color: 'var(--warning)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              No trades were executed. Entry rules may be too strict (e.g. <strong>RSI &lt; 10</strong> is very rare). Try looser rules: <strong>RSI &lt; 30</strong> for oversold entries, <strong>RSI &gt; 70</strong> for overbought exits.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div><div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Total return</div><div style={{ fontWeight: 600 }}>{(result.metrics.total_return * 100).toFixed(2)}%</div></div>
            <div><div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Sharpe</div><div style={{ fontWeight: 600 }}>{result.metrics.sharpe_ratio.toFixed(2)}</div></div>
            <div><div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Max drawdown</div><div style={{ fontWeight: 600 }}>{(result.metrics.max_drawdown * 100).toFixed(2)}%</div></div>
            <div><div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Win rate</div><div style={{ fontWeight: 600 }}>{(result.metrics.win_rate * 100).toFixed(1)}%</div></div>
            <div><div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Trades</div><div style={{ fontWeight: 600 }}>{result.metrics.total_trades}</div></div>
            <div><div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Final equity</div><div style={{ fontWeight: 600 }}>${result.metrics.final_equity.toLocaleString()}</div></div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="index" stroke="var(--muted)" fontSize={12} />
                <YAxis stroke="var(--muted)" fontSize={12} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Equity']} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} labelStyle={{ color: 'var(--text)' }} />
                <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
