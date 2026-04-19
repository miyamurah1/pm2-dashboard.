require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { Pool } = require('pg')

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

pool.on('connect', () => {
  console.log('Postgres connected')
})

pool.on('error', (err) => {
  console.error('Postgres error', err)
})

module.exports = pool