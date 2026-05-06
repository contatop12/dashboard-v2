-- P12 Dashboard — Onda 1 (auth + multi-tenant skeleton)
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'client')),
  name TEXT,
  email_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users (email);

CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_user_id TEXT REFERENCES users (id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_organizations_slug ON organizations (slug);

CREATE TABLE organization_members (
  org_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX idx_org_members_user ON organization_members (user_id);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

CREATE TABLE oauth_credentials (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  authorized_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  access_token_enc TEXT,
  refresh_token_enc TEXT,
  expires_at TEXT,
  scope TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_oauth_cred_user_provider ON oauth_credentials (authorized_user_id, provider);

CREATE TABLE connected_accounts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  external_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  oauth_credential_id TEXT REFERENCES oauth_credentials (id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_connected_org_provider ON connected_accounts (org_id, provider);
