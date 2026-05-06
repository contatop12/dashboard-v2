-- Preferência de conta por organização e canal (Meta Ads, Google Ads, IG, GMN)
PRAGMA foreign_keys = ON;

CREATE TABLE org_account_selections (
  org_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, provider)
);

CREATE INDEX idx_org_account_selections_org ON org_account_selections (org_id);
