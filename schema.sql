-- Haiku community database schema
CREATE TABLE IF NOT EXISTS haikus (
  id TEXT PRIMARY KEY,
  line1 TEXT NOT NULL,
  line2 TEXT NOT NULL,
  line3 TEXT NOT NULL,
  song_title TEXT,
  song_artist TEXT,
  is_exact INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- Index for fetching recent haikus
CREATE INDEX IF NOT EXISTS idx_haikus_created_at ON haikus(created_at DESC);

-- Event tracking table
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  data TEXT,
  created_at INTEGER NOT NULL
);

-- Index for fetching events by type and date
CREATE INDEX IF NOT EXISTS idx_events_type_date ON events(type, created_at DESC);
