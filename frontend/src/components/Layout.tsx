import { Link, useLocation } from 'react-router-dom'
import { isKeycloakEnabled, getKeycloakInstance, logout } from '../keycloak'

export default function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation()
  const k = getKeycloakInstance()
  const username = k?.tokenParsed && typeof (k.tokenParsed as { preferred_username?: string }).preferred_username === 'string'
    ? (k.tokenParsed as { preferred_username: string }).preferred_username
    : null
  const nav = [
    { to: '/', label: 'Dashboard' },
    { to: '/generate', label: 'Generate Strategy' },
    { to: '/backtest', label: 'Backtest' },
    { to: '/strategies', label: 'Top Strategies' },
    { to: '/alerts', label: 'Signal and Alerts' },
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
        <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
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
          {isKeycloakEnabled() && (
            <span style={{ marginLeft: '1rem', fontSize: '0.9rem' }}>
              {username && <span style={{ color: 'var(--muted)', marginRight: '0.5rem' }}>{username}</span>}
              <button
                type="button"
                onClick={() => logout()}
                style={{
                  padding: '0.25rem 0.5rem',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Logout
              </button>
            </span>
          )}
        </nav>
      </header>
      <main style={{ flex: 1, padding: '1.5rem 2rem', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  )
}
