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
