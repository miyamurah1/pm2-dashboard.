require('dotenv').config()
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const pool = require('./db')

// ── LOGIN ────────────────────────────────────────────
async function login(req, reply) {
  try {
    console.log('BODY RECEIVED:', req.body)
    console.log('USERNAME:', req.body?.username)

    const { username, password } = req.body

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    )

    const user = result.rows[0]

    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password)

    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const sessionId = crypto.randomUUID()

    await pool.query(
      `INSERT INTO sessions (id, user_id, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
      [sessionId, user.id]
    )

   reply.setCookie('sessionId', sessionId, {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',    // changed from 'strict' to 'lax'
  maxAge: 86400,
  path: '/'
})

    return { message: 'Logged in', username: user.username }

  } catch (err) {
    console.error('LOGIN ERROR:', err.message)
    console.error('FULL ERROR:', err)
    return reply.status(500).send({ error: err.message })
  }
}

// ── LOGOUT ───────────────────────────────────────────
async function logout(req, reply) {
  try {
    const sessionId = req.cookies.sessionId

    if (sessionId) {
      await pool.query(
        'DELETE FROM sessions WHERE id = $1',
        [sessionId]
      )
    }

    reply.clearCookie('sessionId')
    return { message: 'Logged out' }

  } catch (err) {
    console.error('LOGOUT ERROR:', err.message)
    return reply.status(500).send({ error: err.message })
  }
}

// ── MIDDLEWARE ───────────────────────────────────────
async function requireAuth(req, reply) {
  try {
    const sessionId = req.cookies.sessionId

    if (!sessionId) {
      return reply.status(401).send({ error: 'Not logged in' })
    }

    const result = await pool.query(
      `SELECT sessions.*, users.username 
       FROM sessions 
       JOIN users ON sessions.user_id = users.id
       WHERE sessions.id = $1 
       AND sessions.expires_at > NOW()`,
      [sessionId]
    )

    if (!result.rows[0]) {
      return reply.status(401).send({ error: 'Session expired' })
    }

    req.user = result.rows[0]

  } catch (err) {
    console.error('AUTH ERROR:', err.message)
    return reply.status(500).send({ error: err.message })
  }
}

module.exports = { login, logout, requireAuth }