const bcrypt = require('bcrypt')
const pool = require('./db')
require('dotenv').config()
console.log('DB_PASSWORD:', process.env.DB_PASSWORD)
console.log('DB_USER:', process.env.DB_USER)
console.log('DB_NAME:', process.env.DB_NAME)

async function seed() {
  const username = 'admin'
  const plainPassword = 'admin123'

  // hash the password
  const hashedPassword = await bcrypt.hash(plainPassword, 10)

  // insert user into Postgres
  await pool.query(
    `INSERT INTO users (username, password, role) 
     VALUES ($1, $2, 'admin')
     ON CONFLICT (username) DO NOTHING`,
    [username, hashedPassword]
  )

  console.log('Admin user created')
  console.log('Username: admin')
  console.log('Password: admin123')

  process.exit(0)
}

seed()