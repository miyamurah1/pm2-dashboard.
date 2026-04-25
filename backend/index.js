require('dotenv').config()
const fastify = require('fastify')({ logger: true })
const cookie = require('@fastify/cookie')
const { login, logout, requireAuth } = require('./auth')
const { connectPM2, getProcessList, watchEvents, restartProcess, stopProcess, startProcess } = require('./pm2')
const pool = require('./db')
const path = require('path')
const fs = require('fs')
const { WebSocketServer } = require('ws')

const connections = new Set()

fastify.register(cookie)

// ── Serve test page ───────────────────────────────────────────────────────
fastify.get('/', async (req, reply) => {
  const html = fs.readFileSync(path.join(__dirname, 'test.html'), 'utf8')
  reply.type('text/html').send(html)
})

// ── Public routes ─────────────────────────────────────────────────────────
fastify.post('/login', {
  schema: {
    body: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        password: { type: 'string' }
      },
      required: ['username', 'password']
    }
  }
}, login)

fastify.post('/logout', logout)

// ── Protected routes ──────────────────────────────────────────────────────
fastify.get('/api/processes', { preHandler: requireAuth }, async (req, reply) => {
  const list = await getProcessList()
  return list.map(p => ({
    name: p.name,
    status: p.pm2_env.status,
    cpu: p.monit.cpu,
    memory: p.monit.memory,
    restarts: p.pm2_env.restart_time,
    uptime: p.pm2_env.pm_uptime
  }))
})

fastify.get('/api/logs', { preHandler: requireAuth }, async (req, reply) => {
  try {
    const result = await pool.query(
      `SELECT process_name, level, message, created_at
       FROM logs
       ORDER BY created_at DESC
       LIMIT 200`
    )
    return result.rows
  } catch (err) {
    console.error('Logs query error:', err.message)
    return reply.status(500).send({ error: err.message })
  }
})

fastify.get('/api/metrics/:name', { preHandler: requireAuth }, async (req, reply) => {
  try {
    const result = await pool.query(
      `SELECT cpu, memory, recorded_at
       FROM metrics
       WHERE process_name = $1
       ORDER BY recorded_at DESC
       LIMIT 100`,
      [req.params.name]
    )
    return result.rows
  } catch (err) {
    console.error('Metrics query error:', err.message)
    return reply.status(500).send({ error: err.message })
  }
})

// ── Control routes ────────────────────────────────────────────────────────
fastify.post('/api/process/:name/restart', { preHandler: requireAuth }, async (req, reply) => {
  try {
    await restartProcess(req.params.name)
    return { ok: true }
  } catch (err) {
    return reply.status(500).send({ error: err.message })
  }
})

fastify.post('/api/process/:name/stop', { preHandler: requireAuth }, async (req, reply) => {
  try {
    await stopProcess(req.params.name)
    return { ok: true }
  } catch (err) {
    return reply.status(500).send({ error: err.message })
  }
})

fastify.post('/api/process/:name/start', { preHandler: requireAuth }, async (req, reply) => {
  try {
    await startProcess(req.params.name)
    return { ok: true }
  } catch (err) {
    return reply.status(500).send({ error: err.message })
  }
})

// ── Broadcast helper ──────────────────────────────────────────────────────
function broadcast(data) {
  const message = JSON.stringify(data)
  connections.forEach(socket => {
    if (socket.readyState === 1) socket.send(message)
  })
}

// ── Crash-loop detection ──────────────────────────────────────────────────
const crashTracker = {}

function trackCrash(processName) {
  const now    = Date.now()
  const window = 60 * 1000

  if (!crashTracker[processName]) crashTracker[processName] = []

  crashTracker[processName] = crashTracker[processName]
    .filter(ts => now - ts < window)
  crashTracker[processName].push(now)

  const count = crashTracker[processName].length

  if (count >= 5) {
    broadcast({
      type: 'crash_loop',
      process: processName,
      count,
      message: `${processName} is crash-looping — ${count} restarts in 60 seconds`
    })
    pool.query(
      `INSERT INTO process_events (process_name, event_type, exit_code) VALUES ($1, 'crash_loop', $2)`,
      [processName, count]
    ).catch(err => console.error('DB crash_loop insert error:', err.message))

    crashTracker[processName] = []
  }
}

// ── Push live CPU/memory to all browsers every 2 seconds ─────────────────
// This is what makes the CPU/memory columns update in real time.
// watchEvents alone does NOT send metrics — it only sends status events.
function startMetricsBroadcaster() {
  setInterval(async () => {
    try {
      const list = await getProcessList()
      list.forEach(p => {
        broadcast({
          type: 'metric',
          process: p.name,
          cpu: p.monit.cpu,
          memory: p.monit.memory,
        })
      })
    } catch (err) {
      console.error('Metrics broadcast error:', err.message)
    }
  }, 2000)
}

// ── Save metrics snapshot to Postgres every 30 seconds ───────────────────
function startMetricsWriter() {
  setInterval(async () => {
    try {
      const list = await getProcessList()
      for (const p of list) {
        await pool.query(
          `INSERT INTO metrics (process_name, cpu, memory) VALUES ($1, $2, $3)`,
          [p.name, p.monit.cpu, p.monit.memory]
        )
      }
    } catch (err) {
      console.error('Metrics write error:', err.message)
      broadcast({ type: 'db_error', message: 'Database unavailable — metrics not being saved' })
    }
  }, 30 * 1000)
}

const start = async () => {
  try {
    await connectPM2()
    console.log('PM2 connected')

    watchEvents((event) => {
      broadcast(event)

      if (event.type === 'process_event') {
        const crashStatuses = ['errored', 'stopped']
        if (crashStatuses.includes(event.status)) {
          trackCrash(event.process)
          pool.query(
            `INSERT INTO process_events (process_name, event_type, exit_code) VALUES ($1, $2, $3)`,
            [event.process, event.status, null]
          ).catch(err => console.error('DB event insert error:', err.message))
        }
      }

      if (event.type === 'log' && event.level === 'error') {
        pool.query(
          `INSERT INTO logs (process_name, level, message) VALUES ($1, $2, $3)`,
          [event.process, event.level, event.message]
        ).catch(err => console.error('DB log insert error:', err.message))
      }
    })

    // Start both metric jobs
    startMetricsBroadcaster()
    startMetricsWriter()

    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' })

    const wss = new WebSocketServer({ server: fastify.server })

    wss.on('connection', async (socket, request) => {
      const cookieHeader = request.headers.cookie || ''
      const cookies = {}
      cookieHeader.split(';').forEach(c => {
        const parts = c.trim().split('=')
        const key = parts[0]?.trim()
        const val = parts.slice(1).join('=').trim()
        if (key) cookies[key] = val
      })

      const sessionId = cookies['sessionId']
      if (!sessionId) { socket.close(4001, 'Not authenticated'); return }

      try {
        const result = await pool.query(
          `SELECT sessions.*, users.username 
           FROM sessions JOIN users ON sessions.user_id = users.id
           WHERE sessions.id = $1 AND sessions.expires_at > NOW()`,
          [sessionId]
        )

        if (!result.rows[0]) { socket.close(4001, 'Session expired'); return }

        connections.add(socket)
        console.log(`Client connected — total: ${connections.size}`)

        // Send full process list immediately on connect
        const list = await getProcessList()
        socket.send(JSON.stringify({
          type: 'initial',
          processes: list.map(p => ({
            name: p.name,
            status: p.pm2_env.status,
            cpu: p.monit.cpu,
            memory: p.monit.memory,
            restarts: p.pm2_env.restart_time
          }))
        }))

        socket.on('close', () => {
          connections.delete(socket)
          console.log(`Client disconnected — total: ${connections.size}`)
        })
        socket.on('error', (err) => {
          console.error('Socket error:', err)
          connections.delete(socket)
        })

      } catch (err) {
        console.error('WS auth error:', err)
        socket.close(1011, 'Server error')
      }
    })

    console.log('Server running on port 3000')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

start()