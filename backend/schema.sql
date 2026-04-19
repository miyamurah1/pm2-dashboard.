CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR(100) UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  role        VARCHAR(20) DEFAULT 'viewer',
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT NOW(),
  expires_at  TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS process_events (
  id            SERIAL PRIMARY KEY,
  process_name  TEXT NOT NULL,
  event_type    TEXT NOT NULL,
  exit_code     INTEGER,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metrics (
  id            SERIAL PRIMARY KEY,
  process_name  TEXT NOT NULL,
  cpu           FLOAT,
  memory        FLOAT,
  recorded_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logs (
  id            SERIAL PRIMARY KEY,
  process_name  TEXT NOT NULL,
  level         TEXT NOT NULL,
  message       TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);