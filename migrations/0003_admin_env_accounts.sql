CREATE TABLE IF NOT EXISTS admin_env_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('meta_ads','instagram','google_ads','google_business')),
  external_id TEXT NOT NULL,
  external_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, external_id)
);
