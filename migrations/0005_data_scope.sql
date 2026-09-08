-- 0005_data_scope.sql — Row-level access (привязка "чья карта").
-- Ручная миграция (вне реестра). Аутентификация (кто ты) и авторизация
-- на уровне данных (что ты видишь) — разные вещи: data_scope у пользователя
-- задаёт ширину видимости пациентов, site_id/assigned_clinician_id у пациента —
-- принадлежность карте.

ALTER TABLE users ADD COLUMN site_id TEXT; -- код центра (site), NULL = не привязан
ALTER TABLE users ADD COLUMN data_scope TEXT NOT NULL DEFAULT 'all'
  CHECK (data_scope IN ('all', 'site', 'assigned'));

ALTER TABLE patients ADD COLUMN site_id TEXT;
ALTER TABLE patients ADD COLUMN assigned_clinician_id TEXT REFERENCES users (id);

CREATE INDEX idx_patients_site ON patients (site_id);
CREATE INDEX idx_patients_clinician ON patients (assigned_clinician_id);
CREATE INDEX idx_users_site ON users (site_id);
