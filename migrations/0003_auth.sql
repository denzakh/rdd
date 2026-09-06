-- 0003_auth.sql
-- Аутентификация регистра: пользователи и сессии.
-- Ручная миграция (вне реестра, как 0002_audit.sql): генератор gen:d1 её не трогает.
-- Сессии: в таблице хранится SHA-256(токен) как hex; сам токен — только в HttpOnly cookie.

CREATE TABLE users (
  id TEXT PRIMARY KEY, -- crypto.randomUUID()
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL, -- формат: pbkdf2$<iterations>$<salt-hex>$<hash-hex> (src/shared/lib/password.ts)
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'clinician' CHECK (role IN ('admin', 'clinician', 'readonly')),
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY, -- SHA-256(token) hex, токен в cookie не хранится
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL,
  user_agent TEXT
);

CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);
