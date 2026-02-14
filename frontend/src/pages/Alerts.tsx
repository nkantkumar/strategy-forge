import { useState } from 'react'
import { checkSignals, type Strategy, type SignalCheckResponse } from '../api/client'

const INDICATOR_NAMES = ['rsi', 'macd', 'macd_signal', 'macd_diff', 'sma_20', 'sma_50', 'bb_high', 'bb_low', 'volume_ratio', 'sentiment_score', 'close']

function formatRuleValues(rule: string, currentValues: Record<string, number>): string {
  const parts: string[] = []
  const r = rule.toLowerCase()
  for (const key of INDICATOR_NAMES) {
    if (r.includes(key) && currentValues[key] !== undefined) {
      parts.push(`${key}=${currentValues[key]}`)
    }
  }
  return parts.length ? parts.join(', ') : '—'
}

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

export default function AlertsPage() {
  const [symbol, setSymbol] = useState('AAPL')
  const [strategyJson, setStrategyJson] = useState(JSON.stringify(defaultStrategy, null, 2))
  const [emails, setEmails] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SignalCheckResponse | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    let strategy: Strategy
    try {
      strategy = JSON.parse(strategyJson) as Strategy
    } catch {
      setError('Invalid strategy JSON')
      return
    }
    const emailList = emails.trim() ? emails.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean) : undefined
    setLoading(true)
    try {
      const res = await checkSignals(strategy, symbol, emailList)
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Signal and Alerts</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
        Check if entry or exit conditions match on latest data and send email notifications.
      </p>
      <form onSubmit={handleSubmit} style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--muted)' }}>Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              style={{ width: 120, padding: '0.5rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
            />
          </div>
          <div style={{ flex: '1', minWidth: 200 }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--muted)' }}>Email(s) — optional (comma-separated; uses server default if empty)</label>
            <input
              type="text"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="you@example.com"
              style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}
            />
          </div>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--muted)' }}>Strategy (JSON)</label>
          <textarea
            value={strategyJson}
            onChange={(e) => setStrategyJson(e.target.value)}
            rows={8}
            style={{ width: '100%', padding: '0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '0.6rem 1.2rem', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 6, fontWeight: 600 }}
        >
          {loading ? 'Checking…' : 'Check signals & send email'}
        </button>
      </form>
      {error && (
        <div style={{ padding: '1rem', background: 'rgba(242,78,78,0.15)', borderRadius: 'var(--radius)', color: 'var(--danger)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      {result && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0, color: 'var(--accent)' }}>Result</h3>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            <li>Entry conditions matched: <strong>{result.entry_matched ? 'Yes' : 'No'}</strong></li>
            <li>Exit conditions matched: <strong>{result.exit_matched ? 'Yes' : 'No'}</strong></li>
            {result.entry_email_sent && <li style={{ color: 'var(--accent)' }}>Entry alert email sent.</li>}
            {result.exit_email_sent && <li style={{ color: 'var(--accent)' }}>Exit alert email sent.</li>}
          </ul>
          {result.current_values && Object.keys(result.current_values).length > 0 && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--muted)' }}>All indicators (latest bar)</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {Object.entries(result.current_values).map(([k, v]) => (
                  <span key={k} style={{ background: 'var(--bg)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                    <strong>{k}</strong>=<code>{String(v)}</code>
                  </span>
                ))}
              </div>
              {(result.entry_rules?.length || result.exit_rules?.length) ? (
                <>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--muted)' }}>Current values vs rules</h4>
                  {result.entry_rules?.length ? (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ fontSize: '0.85rem' }}>Entry rules</strong>
                      <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0, fontSize: '0.9rem' }}>
                        {result.entry_rules.map((rule: string, i: number) => (
                          <li key={i} style={{ marginBottom: '0.25rem' }}>
                            <code style={{ background: 'var(--bg)', padding: '0.1rem 0.35rem', borderRadius: 4 }}>{rule}</code>
                            <span style={{ color: 'var(--muted)', marginLeft: '0.5rem' }}>{' -> '}current: {formatRuleValues(rule, result.current_values!)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {result.exit_rules?.length ? (
                    <div>
                      <strong style={{ fontSize: '0.85rem' }}>Exit rules</strong>
                      <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0, fontSize: '0.9rem' }}>
                        {result.exit_rules.map((rule: string, i: number) => (
                          <li key={i} style={{ marginBottom: '0.25rem' }}>
                            <code style={{ background: 'var(--bg)', padding: '0.1rem 0.35rem', borderRadius: 4 }}>{rule}</code>
                            <span style={{ color: 'var(--muted)', marginLeft: '0.5rem' }}>{' -> '}current: {formatRuleValues(rule, result.current_values!)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
