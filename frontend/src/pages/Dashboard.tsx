import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { health } from '../api/client'

export default function Dashboard() {
  const [apiStatus, setApiStatus] = useState<'up' | 'down' | 'loading'>('loading')

  useEffect(() => {
    health()
      .then(() => setApiStatus('up'))
      .catch(() => setApiStatus('down'))
  }, [])

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Dashboard</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
        AI-powered trading strategy generation, backtesting, and optimization.
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '1rem',
      }}>
        <Link to="/generate" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '1.5rem',
          color: 'inherit',
          textDecoration: 'none',
        }}>
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>Generate Strategy</h3>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
            Create a new strategy from market data and sentiment using RAG + LLM.
          </p>
        </Link>
        <Link to="/backtest" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '1.5rem',
          color: 'inherit',
          textDecoration: 'none',
        }}>
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>Run Backtest</h3>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
            Backtest a strategy on historical data and view metrics.
          </p>
        </Link>
        <Link to="/strategies" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '1.5rem',
          color: 'inherit',
          textDecoration: 'none',
        }}>
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--accent)' }}>Top Strategies</h3>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
            View top-performing strategies from the registry.
          </p>
        </Link>
      </div>
      <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: apiStatus === 'up' ? 'var(--accent)' : apiStatus === 'down' ? 'var(--danger)' : 'var(--muted)',
        }} />
        API: {apiStatus === 'up' ? 'Connected' : apiStatus === 'down' ? 'Unavailable' : 'Checking…'}
      </div>
    </div>
  )
}
