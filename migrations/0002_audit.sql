-- 0002_audit.sql — версионирование фаз + системный журнал аудита
-- (docs/ru/matrix.md §6.2, §6.6). Вне реестра (не генерируется gen:d1).
-- Журнал append-only: UPDATE/DELETE запрещены логикой.

ALTER TABLE phases ADD COLUMN updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actor_id TEXT,
  patient_id INTEGER NOT NULL,
  phase_id INTEGER,
  field_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resolution TEXT,
  old_value TEXT,
  new_value TEXT,
  overwritten_version TEXT,
  base_version TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_phase ON audit_log (phase_id, ts);
CREATE INDEX IF NOT EXISTS idx_audit_patient ON audit_log (patient_id, ts);
