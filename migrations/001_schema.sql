-- LinkPulse schema v1
CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS links (
  id          SERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  target      TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  channel     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_links_slug ON links (slug);

CREATE TABLE IF NOT EXISTS clicks (
  id        BIGSERIAL PRIMARY KEY,
  link_id   INTEGER NOT NULL REFERENCES links (id) ON DELETE CASCADE,
  ts        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash   TEXT NOT NULL DEFAULT '',
  device    TEXT NOT NULL DEFAULT '',
  ua        TEXT NOT NULL DEFAULT '',
  referer   TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_clicks_link_ts ON clicks (link_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_ts ON clicks (ts DESC);

CREATE TABLE IF NOT EXISTS daily_stats (
  link_id INTEGER NOT NULL REFERENCES links (id) ON DELETE CASCADE,
  day     DATE NOT NULL,
  clicks  INTEGER NOT NULL DEFAULT 0,
  uniques INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (link_id, day)
);
