import { useState } from 'react'
import { generateStrategy, type GenerateResponse } from '../api/client'

const defaultStart = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().slice(0, 10)
}
const defaultEnd = () => new Date().toISOString().slice(0, 10)

export default function GeneratePage() {
  const [symbol, setSymbol] = useState('AAPL')
  const [startDate, setStartDate] = useState(defaultStart())
  const [endDate, setEndDate] = useState(defaultEnd())
  const [riskTolerance, setRiskTolerance] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResponse | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const res = await generateStrategy({
        symbol,
        start_date: startDate,
        end_date: endDate,
        risk_tolerance: riskTolerance,
      })
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate strategy')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Generate Strategy</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
        Use market data and sentiment to generate a trading strategy (RAG + optional LLM).
      </p>
      <form onSubmit={handleSubmit} style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
        maxWidth: 480,
        marginBottom: '1.5rem',
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--muted)' }}>Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text)',
            }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--muted)' }}>Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text)',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--muted)' }}>End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text)',
              }}
            />
          </div>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--muted)' }}>Risk tolerance</label>
          <select
            value={riskTolerance}
            onChange={(e) => setRiskTolerance(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text)',
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.6rem 1.2rem',
            background: 'var(--accent)',
            color: 'var(--bg)',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
          }}
        >
          {loading ? 'Generating…' : 'Generate Strategy'}
        </button>
      </form>
      {error && (
        <div style={{ padding: '1rem', background: 'rgba(242,78,78,0.15)', borderRadius: 'var(--radius)', color: 'var(--danger)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      {result && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '1.5rem',
        }}>
          <h3 style={{ marginTop: 0, color: 'var(--accent)' }}>Generated: {result.strategy.name}</h3>
          {result.strategy.description && <p style={{ color: 'var(--muted)' }}>{result.strategy.description}</p>}
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Position sizing: {result.strategy.position_sizing} · Max positions: {result.strategy.max_positions}</p>
          <div style={{ marginTop: '1rem' }}>
            <strong>Entry rules</strong>
            <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
              {(result.strategy.entry_rules || []).map((r, i) => <li key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{r}</li>)}
            </ul>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <strong>Exit rules</strong>
            <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
              {(result.strategy.exit_rules || []).map((r, i) => <li key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{r}</li>)}
            </ul>
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
            Save this strategy and run a backtest from the <a href="/backtest">Backtest</a> page (paste strategy JSON or use same symbol/dates).
          </p>
        </div>
      )}
    </div>
  )
}
