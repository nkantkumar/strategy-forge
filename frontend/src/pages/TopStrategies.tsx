import { useState, useEffect } from 'react'
import { getTopStrategies } from '../api/client'

export default function TopStrategiesPage() {
  const [strategies, setStrategies] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTopStrategies(10)
      .then((r) => setStrategies(r.top_strategies || []))
      .catch(() => setError('Failed to load strategies'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Top Strategies</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
        Best-performing strategies from the registry (MLflow). Run backtests to populate.
      </p>
      {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      {!loading && !error && strategies.length === 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          No strategies yet. Generate and backtest strategies to see them here.
        </div>
      )}
      {!loading && strategies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(strategies as Array<Record<string, unknown>>).map((s, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
              <strong>{String(s.name ?? 'Unnamed')}</strong>
              {s.sharpe_ratio != null && <span style={{ marginLeft: '0.5rem', color: 'var(--accent)' }}>Sharpe: {Number(s.sharpe_ratio).toFixed(2)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
