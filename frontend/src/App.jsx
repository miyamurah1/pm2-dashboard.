import { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const GH = {
  bg:       '#0d1117',
  surface:  '#161b22',
  border:   '#21262d',
  border2:  '#30363d',
  text:     '#e6edf3',
  muted:    '#7d8590',
  green:    '#3fb950',
  red:      '#f85149',
  amber:    '#d29922',
  blue:     '#58a6ff',
  purple:   '#bc8cff',
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: StatusDot — animated dot only, no text
// ─────────────────────────────────────────────────────────────────────────────
function StatusDot({ status, size = 8 }) {
  const colors = {
    online:    GH.green,
    stopped:   GH.muted,
    errored:   GH.red,
    stopping:  GH.amber,
    launching: GH.blue,
  }
  const color = colors[status] ?? GH.muted
  const pulse = ['online', 'launching', 'stopping'].includes(status)

  return (
    <span style={{
      width: size, height: size,
      borderRadius: '50%',
      background: color,
      display: 'inline-block',
      flexShrink: 0,
      boxShadow: pulse ? `0 0 6px ${color}` : 'none',
      animation: pulse ? 'glow-green 2s ease-in-out infinite' : 'none',
    }} />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: StatusBadge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    online:    { bg: '#1a3a22', color: GH.green,  border: '#2d5a35' },
    stopped:   { bg: '#1c1c1c', color: GH.muted,  border: '#30363d' },
    errored:   { bg: '#3d1a1a', color: GH.red,    border: '#5a2d2d' },
    stopping:  { bg: '#3d2e0a', color: GH.amber,  border: '#5a4510' },
    launching: { bg: '#0d2044', color: GH.blue,   border: '#1a3566' },
  }
  const { bg, color, border } = cfg[status] ?? cfg.stopped

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 4,
      background: bg, color, border: `1px solid ${border}`,
      fontSize: 11, fontWeight: 500,
    }}>
      <StatusDot status={status} size={6} />
      {status ?? 'unknown'}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: ConfirmDialog
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmDialog({ action, processName, onConfirm, onCancel }) {
  const label  = action.charAt(0).toUpperCase() + action.slice(1)
  const isStop = action === 'stop'

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onCancel])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, backdropFilter: 'blur(4px)',
    }} onClick={onCancel}>
      <div className="slide-down" style={{
        background: GH.surface,
        border: `1px solid ${GH.border2}`,
        borderRadius: 8, padding: 24, width: 300,
        boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>

        {/* Terminal prompt style header */}
        <div style={{ fontFamily: 'JetBrains Mono', marginBottom: 16 }}>
          <span style={{ color: GH.green }}>~/pm2</span>
          <span style={{ color: GH.muted }}> $ </span>
          <span style={{ color: GH.amber }}>pm2 {action} {processName}</span>
          <span className="cursor-blink" style={{ color: GH.text }}>_</span>
        </div>

        <p style={{ color: GH.muted, fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>
          {isStop
            ? 'This will stop the process. Use start to bring it back online.'
            : 'The process will restart. It will be briefly unavailable.'}
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '8px 0',
            background: 'transparent',
            border: `1px solid ${GH.border2}`,
            borderRadius: 5, color: GH.muted,
            fontSize: 12, cursor: 'pointer',
            fontFamily: 'JetBrains Mono',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.target.style.color = GH.text; e.target.style.borderColor = GH.muted }}
            onMouseLeave={e => { e.target.style.color = GH.muted; e.target.style.borderColor = GH.border2 }}
          >
            cancel
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '8px 0',
            background: isStop ? '#3d1a1a' : '#3d2e0a',
            border: `1px solid ${isStop ? '#5a2d2d' : '#5a4510'}`,
            borderRadius: 5,
            color: isStop ? GH.red : GH.amber,
            fontSize: 12, cursor: 'pointer',
            fontFamily: 'JetBrains Mono',
            transition: 'all 0.15s',
          }}>
            {label}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: ProcessCard — sidebar item
// ─────────────────────────────────────────────────────────────────────────────
function ProcessCard({ process: p, selected, onClick }) {
  return (
    <div
      className={`process-card ${selected ? 'process-card-selected' : ''}`}
      onClick={onClick}
      style={{
        padding: '10px 14px',
        cursor: 'pointer',
        borderLeft: selected ? `2px solid ${GH.green}` : '2px solid transparent',
        transition: 'all 0.15s',
        borderBottom: `1px solid ${GH.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusDot status={p.status} size={7} />
          <span style={{ color: GH.text, fontSize: 13, fontWeight: 600 }}>{p.name}</span>
        </div>
        <span style={{
          fontSize: 10, color: p.restarts > 10 ? GH.red : GH.muted,
          opacity: 0.8,
        }}>
          ↺{p.restarts ?? 0}
        </span>
      </div>

      {/* Mini stats row */}
      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: GH.muted }}>
        <span style={{ color: p.cpu > 80 ? GH.red : p.cpu > 40 ? GH.amber : GH.muted }}>
          cpu {p.cpu ?? 0}%
        </span>
        <span>{fmtMem(p.memory)}</span>
        <span style={{ color: p.status === 'online' ? GH.green : GH.muted, marginLeft: 'auto' }}>
          {p.status}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function fmtMem(b) {
  if (b == null) return '0 MB'
  const mb = b / 1048576
  return mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : mb.toFixed(1) + ' MB'
}

function fmtUptime(ts) {
  if (!ts) return '—'
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)   return s + 's'
  if (s < 3600) return Math.floor(s / 60) + 'm ' + (s % 60) + 's'
  return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm'
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: DetailPanel — right side, shows selected process info
// ─────────────────────────────────────────────────────────────────────────────
function DetailPanel({ process: p, logs, histLogs, onLoadHistory, histLoading, histLoaded }) {
  const [tab, setTab]     = useState('overview')
  const [confirm, setConfirm] = useState(null)
  const [loading, setLoading] = useState(null)
  const bottomRef = useRef(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, paused])

  // Filter logs for this process only
  const processLogs = logs.filter(l => l.process === p.name)

  async function execute(action) {
    setConfirm(null)
    setLoading(action)
    try {
      await fetch(`/api/process/${p.name}/${action}`, {
        method: 'POST', credentials: 'include'
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  const isStopped = p.status === 'stopped' || p.status === 'errored'
  const isOnline  = p.status === 'online'

  const btnBase = {
    padding: '6px 14px',
    borderRadius: 5,
    fontSize: 12,
    fontFamily: 'JetBrains Mono',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'all 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    opacity: loading ? 0.5 : 1,
  }

  const tabs = ['overview', 'logs', 'history']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {confirm && (
        <ConfirmDialog action={confirm} processName={p.name}
          onConfirm={() => execute(confirm)} onCancel={() => setConfirm(null)} />
      )}

      {/* ── Detail header ────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 20px',
        borderBottom: `1px solid ${GH.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusDot status={p.status} size={9} />
          <span style={{ color: GH.text, fontSize: 15, fontWeight: 700 }}>{p.name}</span>
          <StatusBadge status={p.status} />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          {isOnline && (
            <button disabled={!!loading} onClick={() => setConfirm('restart')} style={{
              ...btnBase,
              background: '#3d2e0a', color: GH.amber,
              borderColor: '#5a4510',
            }}>
              {loading === 'restart' ? '…' : '↺ restart'}
            </button>
          )}
          {isOnline && (
            <button disabled={!!loading} onClick={() => setConfirm('stop')} style={{
              ...btnBase,
              background: '#3d1a1a', color: GH.red,
              borderColor: '#5a2d2d',
            }}>
              {loading === 'stop' ? '…' : '■ stop'}
            </button>
          )}
          {isStopped && (
            <button disabled={!!loading} onClick={() => execute('start')} style={{
              ...btnBase,
              background: '#1a3a22', color: GH.green,
              borderColor: '#2d5a35',
            }}>
              {loading === 'start' ? '…' : '▶ start'}
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: `1px solid ${GH.border}`,
        flexShrink: 0,
        paddingLeft: 20,
      }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: tab === t ? `2px solid ${GH.green}` : '2px solid transparent',
            color: tab === t ? GH.text : GH.muted,
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'JetBrains Mono',
            transition: 'all 0.15s',
            marginBottom: -1,
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="fade-in">
            {/* Stat grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'CPU Usage',  value: `${p.cpu ?? 0}%`,       color: p.cpu > 80 ? GH.red : p.cpu > 40 ? GH.amber : GH.green },
                { label: 'Memory',     value: fmtMem(p.memory),        color: GH.blue   },
                { label: 'Restarts',   value: p.restarts ?? 0,         color: p.restarts > 10 ? GH.red : GH.text },
                { label: 'Uptime',     value: fmtUptime(p.uptime),     color: GH.muted  },
              ].map(s => (
                <div key={s.label} style={{
                  background: GH.surface,
                  border: `1px solid ${GH.border}`,
                  borderRadius: 6, padding: '14px 16px',
                }}>
                  <p style={{ color: GH.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    {s.label}
                  </p>
                  <p style={{ color: s.color, fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Recent logs preview */}
            <p style={{ color: GH.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Recent output
            </p>
            <div style={{
              background: GH.bg, border: `1px solid ${GH.border}`,
              borderRadius: 6, padding: '8px 0', height: 160, overflowY: 'auto',
            }}>
              {processLogs.slice(-10).length === 0
                ? <p style={{ color: GH.muted, padding: '8px 14px', fontSize: 11, opacity: 0.5 }}>
                    no output yet<span className="cursor-blink">_</span>
                  </p>
                : processLogs.slice(-10).map((l, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, padding: '1px 14px', fontSize: 11,
                    borderLeft: l.level === 'error' ? `2px solid ${GH.red}` : '2px solid transparent',
                  }}>
                    <span style={{ color: l.level === 'error' ? GH.red : GH.muted, flexShrink: 0 }}>
                      {l.level === 'error' ? 'ERR' : 'INF'}
                    </span>
                    <span style={{ color: GH.text, opacity: 0.7, wordBreak: 'break-all' }}>{l.message}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {tab === 'logs' && (
          <div className="fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: GH.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                live output · {processLogs.length} lines
              </span>
              <button onClick={() => setPaused(p => !p)} style={{
                background: 'transparent', border: `1px solid ${GH.border2}`,
                borderRadius: 4, color: GH.muted, fontSize: 11,
                padding: '2px 8px', cursor: 'pointer', fontFamily: 'JetBrains Mono',
              }}>
                {paused ? '▶ resume' : '⏸ pause'}
              </button>
            </div>
            <div style={{
              flex: 1, background: GH.bg,
              border: `1px solid ${GH.border}`,
              borderRadius: 6, overflowY: 'auto',
              fontSize: 11, lineHeight: 1.8,
            }}>
              {processLogs.length === 0
                ? <p style={{ color: GH.muted, padding: '8px 14px', opacity: 0.5 }}>
                    waiting<span className="cursor-blink">_</span>
                  </p>
                : processLogs.map((l, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, padding: '0 14px',
                    borderLeft: l.level === 'error' ? `2px solid ${GH.red}` : '2px solid transparent',
                  }}>
                    <span style={{ color: l.level === 'error' ? GH.red : l.level === 'warn' ? GH.amber : GH.muted, flexShrink: 0, width: 28 }}>
                      {l.level === 'error' ? 'ERR' : l.level === 'warn' ? 'WRN' : 'INF'}
                    </span>
                    <span style={{ color: GH.text, opacity: 0.75, wordBreak: 'break-all' }}>{l.message}</span>
                  </div>
                ))
              }
              <div ref={bottomRef} />
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: GH.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                error log history
              </span>
              <button onClick={onLoadHistory} disabled={histLoading} style={{
                background: 'transparent', border: `1px solid ${GH.border2}`,
                borderRadius: 4, color: GH.muted, fontSize: 11,
                padding: '2px 8px', cursor: 'pointer', fontFamily: 'JetBrains Mono',
                opacity: histLoading ? 0.4 : 1,
              }}>
                {histLoading ? 'querying…' : histLoaded ? '↻ refresh' : 'load history'}
              </button>
            </div>
            <div style={{
              background: GH.bg, border: `1px solid ${GH.border}`,
              borderRadius: 6, overflow: 'auto', fontSize: 11,
              lineHeight: 1.8, maxHeight: 400,
            }}>
              {!histLoaded && !histLoading && (
                <p style={{ color: GH.muted, padding: '8px 14px', opacity: 0.4 }}>
                  Click "load history" to query saved error logs.
                </p>
              )}
              {histLoading && (
                <p style={{ color: GH.muted, padding: '8px 14px' }}>
                  querying postgres<span className="cursor-blink">_</span>
                </p>
              )}
              {histLoaded && histLogs.filter(l => l.process_name === p.name).length === 0 && (
                <p style={{ color: GH.muted, padding: '8px 14px', opacity: 0.4 }}>
                  No error logs for {p.name}.
                </p>
              )}
              {histLoaded && histLogs
                .filter(l => l.process_name === p.name)
                .map((l, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, padding: '0 14px',
                    borderLeft: `2px solid ${GH.red}`,
                  }}>
                    <span style={{ color: GH.muted, flexShrink: 0, fontSize: 10, width: 130, whiteSpace: 'nowrap' }}>
                      {new Date(l.created_at).toLocaleString()}
                    </span>
                    <span style={{ color: GH.red, opacity: 0.8, wordBreak: 'break-all' }}>{l.message}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: LoginPage
// ─────────────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })
      if (!res.ok) { setError('Invalid credentials'); return }
      onLogin()
    } catch {
      setError('Backend unreachable')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: GH.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 340 }}>
        {/* Terminal header */}
        <div style={{
          background: GH.surface, border: `1px solid ${GH.border}`,
          borderRadius: '8px 8px 0 0',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {['#f85149','#d29922','#3fb950'].map(c => (
            <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
          ))}
          <span style={{ color: GH.muted, fontSize: 11, marginLeft: 8 }}>pm2-dashboard — bash</span>
        </div>

        {/* Terminal body */}
        <div style={{
          background: GH.bg, border: `1px solid ${GH.border}`,
          borderTop: 'none', borderRadius: '0 0 8px 8px',
          padding: 24,
        }}>
          {/* Prompt */}
          <div style={{ marginBottom: 20, fontSize: 13 }}>
            <span style={{ color: GH.green }}>~/pm2-dashboard</span>
            <span style={{ color: GH.muted }}> $ </span>
            <span style={{ color: GH.text }}>login</span>
            <span className="cursor-blink" style={{ color: GH.text }}>_</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{
                display: 'block', color: GH.muted,
                fontSize: 10, letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 6,
              }}>username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                required autoFocus placeholder="admin"
                style={{
                  width: '100%', background: GH.surface,
                  border: `1px solid ${GH.border2}`, borderRadius: 5,
                  padding: '9px 12px', color: GH.text,
                  fontFamily: 'JetBrains Mono', fontSize: 13,
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = GH.muted}
                onBlur={e => e.target.style.borderColor = GH.border2}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: 'block', color: GH.muted,
                fontSize: 10, letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 6,
              }}>password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••"
                style={{
                  width: '100%', background: GH.surface,
                  border: `1px solid ${GH.border2}`, borderRadius: 5,
                  padding: '9px 12px', color: GH.text,
                  fontFamily: 'JetBrains Mono', fontSize: 13,
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = GH.muted}
                onBlur={e => e.target.style.borderColor = GH.border2}
              />
            </div>

            {error && (
              <div className="slide-down" style={{
                background: '#3d1a1a', border: `1px solid #5a2d2d`,
                borderRadius: 5, padding: '8px 12px',
                color: GH.red, fontSize: 12, marginBottom: 14,
              }}>
                ✕ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '10px 0',
              background: loading ? GH.surface : GH.text,
              color: GH.bg, border: 'none', borderRadius: 5,
              fontFamily: 'JetBrains Mono', fontSize: 13,
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}>
              {loading ? 'authenticating…' : '→ sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: App (root)
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn,    setLoggedIn]    = useState(false)
  const [processes,   setProcesses]   = useState([])
  const [logs,        setLogs]        = useState([])
  const [connected,   setConnected]   = useState(false)
  const [wsError,     setWsError]     = useState(null)
  const [crashAlerts, setCrashAlerts] = useState([])
  const [selected,    setSelected]    = useState(null)
  const [histLogs,    setHistLogs]    = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [histLoaded,  setHistLoaded]  = useState(false)

  // Auto-select first process
  useEffect(() => {
    if (processes.length > 0 && !selected) {
      setSelected(processes[0].name)
    }
  }, [processes])

  async function loadHistory() {
    setHistLoading(true)
    try {
      const res = await fetch('/api/logs', { credentials: 'include' })
      if (res.ok) { setHistLogs(await res.json()); setHistLoaded(true) }
    } catch (err) {
      console.error(err)
    } finally {
      setHistLoading(false)
    }
  }

  // ── WebSocket ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loggedIn) return
    let ws, destroyed = false

    function connect() {
      ws = new WebSocket(`ws://${location.host}/ws`)
      ws.onopen  = () => { setConnected(true); setWsError(null) }
      ws.onclose = ({ code }) => {
        setConnected(false)
        if (code === 4001)   { setWsError('Session expired'); setLoggedIn(false) }
        else if (!destroyed) { setWsError('Reconnecting…'); setTimeout(connect, 3000) }
      }
      ws.onerror = () => setWsError('WebSocket error')
      ws.onmessage = ({ data }) => {
        const msg = JSON.parse(data)
        if (msg.type === 'initial')       setProcesses(msg.processes)
        if (msg.type === 'process_event') setProcesses(p => p.map(x => x.name === msg.process ? { ...x, status: msg.status } : x))
        if (msg.type === 'metric')        setProcesses(p => p.map(x => x.name === msg.process ? { ...x, cpu: msg.cpu, memory: msg.memory } : x))
        if (msg.type === 'log')           setLogs(p => [...p.slice(-199), msg])
        if (msg.type === 'crash_loop')    setCrashAlerts(p => [...p, msg])
      }
    }

    connect()
    return () => { destroyed = true; ws?.close() }
  }, [loggedIn])

  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />

  const selectedProcess = processes.find(p => p.name === selected)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: GH.bg }}>

      {/* ── Titlebar ──────────────────────────────────────────────────── */}
      <div style={{
        height: 40, flexShrink: 0,
        background: GH.surface,
        borderBottom: `1px solid ${GH.border}`,
        display: 'flex', alignItems: 'center',
        padding: '0 16px',
        justifyContent: 'space-between',
      }}>
        {/* Left: window dots + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#f85149','#d29922','#3fb950'].map(c => (
              <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block', opacity: 0.8 }} />
            ))}
          </div>
          <span style={{ color: GH.muted, fontSize: 12 }}>
            <span style={{ color: GH.green }}>~/pm2-dashboard</span>
            <span style={{ color: GH.muted }}> — process monitor</span>
          </span>
        </div>

        {/* Right: connection status + process count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: GH.muted, fontSize: 11 }}>
            {processes.length} process{processes.length !== 1 ? 'es' : ''}
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', borderRadius: 4,
            background: connected ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
            border: `1px solid ${connected ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)'}`,
            fontSize: 11,
            color: connected ? GH.green : GH.red,
          }}>
            <StatusDot status={connected ? 'online' : 'errored'} size={6} />
            {connected ? 'connected' : 'disconnected'}
          </div>
        </div>
      </div>

      {/* ── Alerts ────────────────────────────────────────────────────── */}
      {(wsError || crashAlerts.length > 0) && (
        <div style={{ flexShrink: 0, padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {wsError && (
            <div className="slide-down" style={{
              padding: '6px 12px', borderRadius: 4, fontSize: 11,
              background: '#3d2e0a', border: `1px solid #5a4510`, color: GH.amber,
            }}>
              ⚠ {wsError}
            </div>
          )}
          {crashAlerts.map((a, i) => (
            <div key={i} className="slide-down" style={{
              padding: '6px 12px', borderRadius: 4, fontSize: 11,
              background: '#3d1a1a', border: `1px solid #5a2d2d`, color: GH.red,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>🔴 {a.message}</span>
              <button onClick={() => setCrashAlerts(p => p.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', color: GH.red, cursor: 'pointer', fontSize: 14, padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Main split pane ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Sidebar ───────────────────────────────────────────────── */}
        <div style={{
          width: 220, flexShrink: 0,
          background: GH.surface,
          borderRight: `1px solid ${GH.border}`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Sidebar header */}
          <div style={{
            padding: '8px 14px',
            borderBottom: `1px solid ${GH.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: GH.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Processes
            </span>
            <span style={{
              background: GH.border, color: GH.muted,
              borderRadius: 3, padding: '0 5px', fontSize: 10,
            }}>
              {processes.length}
            </span>
          </div>

          {/* Process list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {processes.length === 0 ? (
              <p style={{ color: GH.muted, padding: 14, fontSize: 11, opacity: 0.5 }}>
                no processes<span className="cursor-blink">_</span>
              </p>
            ) : (
              processes.map(p => (
                <ProcessCard
                  key={p.name}
                  process={p}
                  selected={selected === p.name}
                  onClick={() => setSelected(p.name)}
                />
              ))
            )}
          </div>

          {/* Sidebar footer — global stats */}
          <div style={{
            borderTop: `1px solid ${GH.border}`,
            padding: '8px 14px',
            fontSize: 10, color: GH.muted,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span>online</span>
              <span style={{ color: GH.green }}>{processes.filter(p => p.status === 'online').length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span>stopped</span>
              <span>{processes.filter(p => p.status === 'stopped').length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>errored</span>
              <span style={{ color: GH.red }}>{processes.filter(p => p.status === 'errored').length}</span>
            </div>
          </div>
        </div>

        {/* ── Detail pane ───────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {selectedProcess ? (
            <DetailPanel
              process={selectedProcess}
              logs={logs}
              histLogs={histLogs}
              onLoadHistory={loadHistory}
              histLoading={histLoading}
              histLoaded={histLoaded}
            />
          ) : (
            <div style={{
              height: '100%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: GH.muted, fontSize: 13,
            }}>
              select a process<span className="cursor-blink">_</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}