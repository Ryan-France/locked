-- Locked D1 schema (Cloudflare D1 = SQLite). Apply with:
--   npx wrangler d1 execute locked --file worker/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  identity TEXT, town TEXT, hue INTEGER DEFAULT 150, photo_url TEXT,
  age INTEGER, bodyweight_kg REAL, rhr INTEGER, lthr INTEGER, max_hr INTEGER,
  goal_name TEXT, goal_date TEXT,
  settings TEXT DEFAULT '{}',            -- theme, notifications, privacy (JSON)
  tier TEXT DEFAULT 'free',              -- room for paid tiers later
  created_at TEXT DEFAULT (datetime('now'))
);

-- GDPR Art. 9: explicit consent for health data, per source, revocable
CREATE TABLE IF NOT EXISTS consents (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL, granted_at TEXT NOT NULL, revoked_at TEXT,
  text_version TEXT NOT NULL, PRIMARY KEY (user_id, source, granted_at)
);

CREATE TABLE IF NOT EXISTS connections (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,                -- garmin | whoop | coros | fitbit | oura | apple | polar | suunto | strava
  external_id TEXT, token_enc TEXT,      -- encrypted with a Worker secret
  last_sync TEXT, primary_source INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, provider)
);

CREATE TABLE IF NOT EXISTS daily (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL, src TEXT NOT NULL,
  rhr INTEGER, hrv REAL, sleep_h REAL, bed_min_after_18 INTEGER, steps INTEGER, manual INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, date, src)       -- two devices on one night = paired data for offset learning
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  src TEXT NOT NULL, external_id TEXT, date TEXT NOT NULL, time TEXT,
  sport TEXT NOT NULL, type TEXT, name TEXT, minutes REAL NOT NULL, km REAL,
  avg_hr INTEGER, max_hr INTEGER, elev_m INTEGER,
  z1_min REAL, z2_min REAL, z3_min REAL, z4_min REAL, z5_min REAL,
  sets TEXT,                             -- JSON [{lift, kg, reps}]
  manual INTEGER DEFAULT 0, stress INTEGER,
  UNIQUE (src, external_id)
);
CREATE INDEX IF NOT EXISTS act_user_date ON activities (user_id, date);

CREATE TABLE IF NOT EXISTS friendships (
  a TEXT NOT NULL, b TEXT NOT NULL,      -- a < b
  status TEXT NOT NULL,                  -- pending | accepted
  requested_by TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (a, b)
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
  privacy TEXT NOT NULL CHECK (privacy IN ('public','private')),
  icon TEXT NOT NULL, color TEXT NOT NULL,
  photo_url TEXT,                        -- private groups only (enforced in API)
  invite_code TEXT UNIQUE, created_by TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS group_members (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', joined_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT, dm_key TEXT,            -- one of the two
  sender TEXT, kind TEXT DEFAULT 'text', -- text | champions
  body TEXT NOT NULL, at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS champions (
  group_id TEXT NOT NULL, week TEXT NOT NULL, award TEXT NOT NULL,
  user_id TEXT NOT NULL, value REAL, PRIMARY KEY (group_id, week, award)
);

CREATE TABLE IF NOT EXISTS kudos (activity_id TEXT, user_id TEXT, PRIMARY KEY (activity_id, user_id));
CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, activity_id TEXT, user_id TEXT, body TEXT, at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS challenges (id TEXT PRIMARY KEY, a TEXT, b TEXT, metric TEXT, start TEXT, end TEXT, stake TEXT, status TEXT);
CREATE TABLE IF NOT EXISTS badges (user_id TEXT, badge TEXT, earned TEXT, PRIMARY KEY (user_id, badge));
CREATE TABLE IF NOT EXISTS device_offsets (provider TEXT PRIMARY KEY, rhr_offset REAL, pairs INTEGER, updated TEXT);
