import { Link, useLocation } from 'react-router-dom'

export default function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation()
  const nav = [
    { to: '/', label: 'Dashboard' },
    { to: '/generate', label: 'Generate Strategy' },
    { to: '/backtest', label: 'Backtest' },
    { to: '/strategies', label: 'Top Strategies' },
  ]
  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link to="/" style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 700, fontSize: '1.25rem' }}>
          Strategy Forge
        </Link>
        <nav style={{ display: 'flex', gap: '1.5rem' }}>
          {nav.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              style={{
                color: loc.pathname === to ? 'var(--accent)' : 'var(--muted)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main style={{ flex: 1, padding: '1.5rem 2rem', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  )
}
