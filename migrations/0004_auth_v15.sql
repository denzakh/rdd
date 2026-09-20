-- 0004_auth_v15.sql — Auth v1.5 (docs/ru/spec-stage-3.md).
-- Ручная миграция (вне реестра). Rate-limit входа + инвайты.

ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TEXT; -- ISO, NULL = не заблокирован

CREATE TABLE invites (
  id TEXT PRIMARY KEY,             -- uuid
  token_hash TEXT NOT NULL UNIQUE, -- SHA-256(токен из ссылки), как в sessions
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','clinician','readonly')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at TEXT NOT NULL,        -- 7 дней
  used_at TEXT                     -- NULL = не использован
);

CREATE INDEX idx_invites_email ON invites (email);
