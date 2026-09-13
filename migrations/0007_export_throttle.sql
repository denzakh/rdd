-- 0007_export_throttle.sql — троттлинг экспорта (docs/export.md §2, docs/threat-model.md §2 D).
-- Ручная миграция (вне реестра, как 0002-0006): переживает db:restart через MANUAL_MIGRATIONS.
-- exportDeidentified — самый дорогой Server Action (полная выборка patients+phases,
-- де-идентификация в памяти); флуд им бьёт по D1 сильнее обычного CRUD.
-- Минимальная защита: 1 экспорт / 60 с на пользователя (users.last_export_at, ISO).
-- Это НЕ часть login rate-limit (failed_attempts/locked_until): смешивание счётчиков
-- неверно — флуд экспорта не должен блокировать вход, а перебор пароля — экспорт.

ALTER TABLE users ADD COLUMN last_export_at TEXT; -- ISO, NULL = экспорт ещё не выполнялся
