import { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────
// COMPONENT: StatusBadge
// ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    online:   'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
    errored:  'bg-red-500/20    text-red-400    border border-red-500/40',
    stopped:  'bg-zinc-500/20   text-zinc-400   border border-zinc-500/40',
    stopping: 'bg-amber-500/20  text-amber-400  border border-amber-500/40',
    launching:'bg-blue-500/20   text-blue-400   border border-blue-500/40',
  }
  const dots = {
    online:   'bg-emerald-400 animate-pulse',
    errored:  'bg-red-400',
    stopped:  'bg-zinc-500',
    stopping: 'bg-amber-400 animate-pulse',
    launching:'bg-blue-400 animate-pulse',
  }
  const cls = styles[status] ?? styles.stopped
  const dot = dots[status]   ?? dots.stopped
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status ?? 'unknown'}
    </span>
  )
}

// ─────────────────────────────────────────────
// COMPONENT: ConfirmDialog
// ─────────────────────────────────────────────
function ConfirmDialog({ action, processName, onConfirm, onCancel }) {
  const isStop  = action === 'stop'
  const colour  = isStop ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'
  const label   = action.charAt(0).toUpperCase() + action.slice(1)
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-80 shadow-2xl">
        <h2 className="text-zinc-100 font-mono font-semibold text-base mb-1">{label} process?</h2>
        <p className="text-zinc-400 text-sm font-mono mb-6">
          Are you sure you want to {action}{' '}
          <span className="text-zinc-200 font-medium">{processName}</span>?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400
                       hover:text-zinc-200 hover:border-zinc-500 text-sm font-mono transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-mono transition-colors ${colour}`}>
            {label}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENT: ActionButtons
// ─────────────────────────────────────────────
function ActionButtons({ process: p, onAction }) {
  const [loading, setLoading] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const isStopped = p.status === 'stopped' || p.status === 'errored'
  const isOnline  = p.status === 'online'

  function handleClick(action) {
    if (action === 'start') execute(action)
    else setConfirm(action)
  }

  async function execute(action) {
    setConfirm(null)
    setLoading(action)
    try {
      const res = await fetch(`/api/process/${p.name}/${action}`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json()
        console.error(`${action} failed:`, data.error)
      }
    } catch (err) {
      console.error(`${action} error:`, err.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      {confirm && (
        <ConfirmDialog
          action={confirm}
          processName={p.name}
          onConfirm={() => execute(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
      <div className="flex items-center gap-1.5 justify-end">
        {isOnline && (
          <button onClick={() => handleClick('restart')} disabled={loading !== null} title="Restart"
            className="px-2.5 py-1 rounded-md text-xs font-mono bg-amber-500/10 text-amber-400
                       border border-amber-500/30 hover:bg-amber-500/20 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed">
            {loading === 'restart' ? '…' : '↺ restart'}
          </button>
        )}
        {isOnline && (
          <button onClick={() => handleClick('stop')} disabled={loading !== null} title="Stop"
            className="px-2.5 py-1 rounded-md text-xs font-mono bg-red-500/10 text-red-400
                       border border-red-500/30 hover:bg-red-500/20 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed">
            {loading === 'stop' ? '…' : '■ stop'}
          </button>
        )}
        {isStopped && (
          <button onClick={() => handleClick('start')} disabled={loading !== null} title="Start"
            className="px-2.5 py-1 rounded-md text-xs font-mono bg-emerald-500/10 text-emerald-400
                       border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed">
            {loading === 'start' ? '…' : '▶ start'}
          </button>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────
// COMPONENT: ProcessTable
// ─────────────────────────────────────────────
function ProcessTable({ processes }) {
  function formatMem(bytes) {
    if (bytes == null) return '—'
    const mb = bytes / 1024 / 1024
    if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB'
    return mb.toFixed(1) + ' MB'
  }
  function formatUptime(ts) {
    if (!ts) return '—'
    const secs = Math.floor((Date.now() - ts) / 1000)
    if (secs < 60)   return secs + 's'
    if (secs < 3600) return Math.floor(secs / 60) + 'm'
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    return `${h}h ${m}m`
  }
  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider font-mono">
            <th className="px-5 py-3 text-left">Process</th>
            <th className="px-5 py-3 text-left">Status</th>
            <th className="px-5 py-3 text-right">CPU</th>
            <th className="px-5 py-3 text-right">Memory</th>
            <th className="px-5 py-3 text-right">Restarts</th>
            <th className="px-5 py-3 text-right">Uptime</th>
            <th className="px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {processes.length === 0 ? (
            <tr>
              <td colSpan="7" className="px-5 py-10 text-center text-zinc-600 font-mono text-sm">
                waiting for process data…
              </td>
            </tr>
          ) : (
            processes.map(p => (
              <tr key={p.name} className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
                <td className="px-5 py-3.5 text-zinc-100 font-mono font-medium">{p.name}</td>
                <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                <td className={`px-5 py-3.5 text-right font-mono tabular-nums
                  ${p.cpu > 80 ? 'text-red-400' : p.cpu > 40 ? 'text-amber-400' : 'text-zinc-300'}`}>
                  {p.cpu ?? 0}%
                </td>
                <td className="px-5 py-3.5 text-right font-mono tabular-nums text-zinc-300">
                  {formatMem(p.memory)}
                </td>
                <td className={`px-5 py-3.5 text-right font-mono tabular-nums
                  ${p.restarts > 10 ? 'text-red-400' : 'text-zinc-300'}`}>
                  {p.restarts ?? 0}
                </td>
                <td className="px-5 py-3.5 text-right font-mono tabular-nums text-zinc-400">
                  {formatUptime(p.uptime)}
                </td>
                <td className="px-5 py-3.5">
                  <ActionButtons process={p} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENT: LiveLogViewer
// Last 100 live lines from WebSocket
// ─────────────────────────────────────────────
function LiveLogViewer({ logs }) {
  const bottomRef = useRef(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  function levelColour(level) {
    if (level === 'error') return 'text-red-400'
    if (level === 'warn')  return 'text-amber-400'
    return 'text-zinc-400'
  }
  function levelLabel(level) {
    if (level === 'error') return 'ERR'
    if (level === 'warn')  return 'WRN'
    return 'INF'
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <div className="bg-zinc-900 border-b border-zinc-800 px-5 py-3 flex items-center justify-between">
        <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider">Live Logs</span>
        <span className="text-zinc-600 text-xs font-mono">{logs.length} / 100 lines</span>
      </div>
      <div className="h-48 overflow-y-auto bg-zinc-950 font-mono text-xs leading-relaxed">
        {logs.length === 0 ? (
          <p className="text-zinc-700 px-5 py-4">no logs yet…</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-3 px-5 py-0.5 hover:bg-zinc-900/50">
              <span className={`shrink-0 w-8 ${levelColour(log.level)}`}>{levelLabel(log.level)}</span>
              <span className="shrink-0 text-blue-400 w-24 truncate">{log.process}</span>
              <span className="text-zinc-300 break-all">{log.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENT: HistoricalLogViewer
// Queries Postgres for saved ERROR logs.
// ─────────────────────────────────────────────
function HistoricalLogViewer() {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [loaded,  setLoaded]  = useState(false)  // has it been fetched yet?

  async function fetchLogs() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/logs', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch logs')
      const data = await res.json()
      setLogs(data)
      setLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Format the Postgres timestamp into a readable string
  function formatTime(ts) {
    return new Date(ts).toLocaleString()
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header with refresh button */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-5 py-3 flex items-center justify-between">
        <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider">
          Error Log History
        </span>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-3 py-1 rounded-md text-xs font-mono bg-zinc-800 text-zinc-400
                     hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700
                     transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading…' : loaded ? '↻ Refresh' : 'Load history'}
        </button>
      </div>

      {/* Log list */}
      <div className="h-48 overflow-y-auto bg-zinc-950 font-mono text-xs leading-relaxed">
        {!loaded && !loading && (
          <p className="text-zinc-700 px-5 py-4">
            Click "Load history" to query the database for past errors.
          </p>
        )}
        {loading && (
          <p className="text-zinc-500 px-5 py-4">Querying database…</p>
        )}
        {error && (
          <p className="text-red-400 px-5 py-4">Error: {error}</p>
        )}
        {loaded && !loading && logs.length === 0 && (
          <p className="text-zinc-700 px-5 py-4">No error logs saved yet.</p>
        )}
        {loaded && logs.map((log, i) => (
          <div key={i} className="flex gap-3 px-5 py-0.5 hover:bg-zinc-900/50">
            {/* Timestamp */}
            <span className="shrink-0 text-zinc-600 w-36 truncate">
              {formatTime(log.created_at)}
            </span>
            {/* Process name */}
            <span className="shrink-0 text-blue-400 w-24 truncate">
              {log.process_name}
            </span>
            {/* Message */}
            <span className="text-red-400 break-all">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENT: CrashLoopAlert
// Shown when the backend detects a crash loop.
// Dismissed by clicking the X.
// ─────────────────────────────────────────────
function CrashLoopAlert({ alerts, onDismiss }) {
  if (alerts.length === 0) return null
  return (
    <div className="space-y-2 mb-4">
      {alerts.map((alert, i) => (
        <div key={i}
          className="flex items-center justify-between px-4 py-3 rounded-lg
                     bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-mono">
          <span>🔴 {alert.message}</span>
          <button
            onClick={() => onDismiss(i)}
            className="text-red-500 hover:text-red-300 ml-4 text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENT: LoginPage
// ─────────────────────────────────────────────
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
      if (!res.ok) {
        setError('Wrong username or password')
        return
      }
      onLogin()
    } catch (err) {
      setError('Server unreachable — is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-100 font-mono tracking-tight">PM2 Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">sign in to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-xs text-zinc-500 font-mono mb-1.5 uppercase tracking-wider">
              Username
            </label>
            <input id="username" name="username" type="text" value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5
                         text-zinc-100 font-mono text-sm focus:outline-none focus:border-zinc-500
                         focus:ring-1 focus:ring-zinc-500 placeholder:text-zinc-600"
              placeholder="admin" required />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs text-zinc-500 font-mono mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input id="password" name="password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5
                         text-zinc-100 font-mono text-sm focus:outline-none focus:border-zinc-500
                         focus:ring-1 focus:ring-zinc-500 placeholder:text-zinc-600"
              placeholder="••••••••" required />
          </div>
          {error && (
            <p className="text-red-400 text-sm font-mono bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading}
            className="w-full bg-zinc-100 hover:bg-white text-zinc-900 font-mono font-medium
                       py-2.5 rounded-lg text-sm transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENT: App (root)
// ─────────────────────────────────────────────
export default function App() {
  const [loggedIn,    setLoggedIn]    = useState(false)
  const [processes,   setProcesses]   = useState([])
  const [logs,        setLogs]        = useState([])   // live logs
  const [connected,   setConnected]   = useState(false)
  const [wsError,     setWsError]     = useState(null)
  const [dbError,     setDbError]     = useState(null) // DB down banner
  const [crashAlerts, setCrashAlerts] = useState([])   // crash-loop alerts

  useEffect(() => {
    if (!loggedIn) return

    let ws
    let destroyed = false

    function connect() {
      const url = `ws://${location.host}/ws`
      ws = new WebSocket(url)

      ws.onopen = () => {
        setConnected(true)
        setWsError(null)
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'initial') {
          setProcesses(data.processes)
        }

        if (data.type === 'process_event') {
          setProcesses(prev => prev.map(p =>
            p.name === data.process ? { ...p, status: data.status } : p
          ))
        }

        if (data.type === 'metric') {
          setProcesses(prev => prev.map(p =>
            p.name === data.process ? { ...p, cpu: data.cpu, memory: data.memory } : p
          ))
        }

        if (data.type === 'log') {
          setLogs(prev => [...prev.slice(-99), data])
        }

        // ── NEW: Crash-loop alert ──────────────────────────────────────
        // Backend sends this when a process crashes 5+ times in 60s
        if (data.type === 'crash_loop') {
          setCrashAlerts(prev => [...prev, data])
        }

        // ── NEW: DB error banner ───────────────────────────────────────
        // Backend sends this when it can't write to Postgres
        if (data.type === 'db_error') {
          setDbError(data.message)
          // Auto-clear after 10 seconds
          setTimeout(() => setDbError(null), 10000)
        }
      }

      ws.onclose = (event) => {
        setConnected(false)
        if (event.code === 4001) {
          setWsError('Session expired — please sign in again')
          setLoggedIn(false)
        } else if (!destroyed) {
          setWsError('Connection lost — reconnecting…')
          setTimeout(connect, 3000)
        }
      }

      ws.onerror = () => setWsError('WebSocket error')
    }

    connect()

    return () => {
      destroyed = true
      ws?.close()
    }
  }, [loggedIn])

  function dismissCrashAlert(index) {
    setCrashAlerts(prev => prev.filter((_, i) => i !== index))
  }

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-zinc-100">PM2 Dashboard</h1>
          <p className="text-zinc-600 text-xs font-mono mt-0.5">
            {processes.length} process{processes.length !== 1 ? 'es' : ''} monitored
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono
          ${connected
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10    border-red-500/30    text-red-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          {connected ? 'Live' : 'Disconnected'}
        </div>
      </div>

      {/* WebSocket error banner */}
      {wsError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-mono">
          ⚠ {wsError}
        </div>
      )}

      {/* DB error banner — auto-clears after 10s */}
      {dbError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-sm font-mono flex items-center justify-between">
          <span>⚠ {dbError}</span>
          <button onClick={() => setDbError(null)} className="text-orange-500 hover:text-orange-300 ml-4 text-lg">×</button>
        </div>
      )}

      {/* Crash-loop alerts — one per detected loop, dismissable */}
      <CrashLoopAlert alerts={crashAlerts} onDismiss={dismissCrashAlert} />

      {/* Process table */}
      <div className="mb-6">
        <ProcessTable processes={processes} />
      </div>

      {/* Live log viewer */}
      <div className="mb-6">
        <LiveLogViewer logs={logs} />
      </div>

      {/* Historical error log viewer */}
      <HistoricalLogViewer />

    </div>
  )
}