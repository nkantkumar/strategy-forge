import { useState, useEffect, useCallback } from 'react'
import { getTopStrategies, type TopStrategy } from '../api/client'

export default function TopStrategiesPage() {
  const [strategies, setStrategies] = useState<TopStrategy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderBy, setOrderBy] = useState<'sharpe_ratio' | 'total_return' | 'win_rate'>('sharpe_ratio')

  const load = useCallback(() => {
    setError(null)
    setLoading(true)
    getTopStrategies(20, orderBy)
      .then((r) => setStrategies(r.top_strategies || []))
      .catch(() => setError('Failed to load strategies. Is MLflow running?'))
      .finally(() => setLoading(false))
  }, [orderBy])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Top Strategies</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
        Best-performing strategies from the registry (MLflow). Run backtests to log and compare.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <label style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Sort by:
          <select
            value={orderBy}
            onChange={(e) => setOrderBy(e.target.value as 'sharpe_ratio' | 'total_return' | 'win_rate')}
            style={{ marginLeft: '0.5rem', padding: '0.35rem 0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
          >
            <option value="sharpe_ratio">Sharpe ratio</option>
            <option value="total_return">Total return</option>
            <option value="win_rate">Win rate</option>
          </select>
        </label>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{ padding: '0.5rem 1rem', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6 }}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
      {error && (
        <div style={{ padding: '1rem', background: 'rgba(242,78,78,0.15)', borderRadius: 'var(--radius)', color: 'var(--danger)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      {!loading && !error && strategies.length === 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          <p style={{ margin: '0 0 0.5rem' }}>No strategies yet.</p>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Run backtests from the Backtest page — each run is logged to MLflow and will appear here.</p>
        </div>
      )}
      {!loading && strategies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {strategies.map((s, i) => (
            <div
              key={s.run_id ?? i}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '1rem 1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1.05rem' }}>{s.name || 'Unnamed'}</strong>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  Sharpe {s.sharpe_ratio != null ? s.sharpe_ratio.toFixed(2) : '—'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem', marginTop: '0.75rem', fontSize: '0.9rem' }}>
                {s.total_return != null && (
                  <span style={{ color: 'var(--muted)' }}>Return: <strong style={{ color: 'var(--text)' }}>{(s.total_return * 100).toFixed(2)}%</strong></span>
                )}
                {s.max_drawdown != null && (
                  <span style={{ color: 'var(--muted)' }}>Max DD: <strong style={{ color: 'var(--text)' }}>{(s.max_drawdown * 100).toFixed(2)}%</strong></span>
                )}
                {s.win_rate != null && (
                  <span style={{ color: 'var(--muted)' }}>Win rate: <strong style={{ color: 'var(--text)' }}>{(s.win_rate * 100).toFixed(1)}%</strong></span>
                )}
                {s.total_trades != null && (
                  <span style={{ color: 'var(--muted)' }}>Trades: <strong style={{ color: 'var(--text)' }}>{s.total_trades}</strong></span>
                )}
                {s.position_sizing && (
                  <span style={{ color: 'var(--muted)' }}>Sizing: {s.position_sizing}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
