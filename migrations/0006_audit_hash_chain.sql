-- 0006_audit_hash_chain.sql — целостность audit_log: hash-chain + DB-триггеры
-- (docs/ru/threat-model.md §2 R, docs/ru/matrix.md §6.6). Вне реестра (не gen:d1).
-- Ранее append-only обеспечивался только логикой приложения; доверенный оператор
-- с прямым доступом к БД мог отредактировать журнал (repudiation). Теперь:
--  1) колонки prev_hash/entry_hash — каждая запись хэширует предыдущую (SHA-256);
--  2) триггеры запрещают UPDATE/DELETE на уровне SQLite (RAISE ABORT).

ALTER TABLE audit_log ADD COLUMN prev_hash TEXT;
ALTER TABLE audit_log ADD COLUMN entry_hash TEXT;

-- Только одна запись может ссылаться на данный prev_hash — защита от форка цепочки
-- (например, при гонке двух параллельных вставок или попытке переписать историю).
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_prev_hash
  ON audit_log (prev_hash) WHERE prev_hash IS NOT NULL;

-- Append-only на уровне БД: любое UPDATE/DELETE журналa — ошибка транзакции.
CREATE TRIGGER IF NOT EXISTS audit_no_update
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only: UPDATE denied');
END;

CREATE TRIGGER IF NOT EXISTS audit_no_delete
BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only: DELETE denied');
END;
