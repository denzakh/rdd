# Спецификация: Аутентификация и управление пользователями (docs/auth.md)

**Статус:** реализовано (v1) · **Миграция:** `0003_auth.sql` · **Слой FSD:** `src/features/auth` + `src/shared/api/session-repo.ts`

---

## 1. Контекст и ограничения

Регистр клинических данных — публичная регистрация исключена. Учетки создает
только администратор. Ключевые ограничения стека:

- Runtime — **Cloudflare Workers** (`@opennextjs/cloudflare`): нет `node:crypto`
  для bcrypt/argon2, нужен Web Crypto (`crypto.subtle`);
- единственная БД — **D1**, отдельного identity-провайдера нет;
- принцип проекта — минимум внешних зависимостей (без Auth.js/Lucia).

## 2. Рассмотренные варианты (решения)

| Вариант                                              | Решение                                                                                                  |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Собственные сессии на D1 + PBKDF2 (Web Crypto)       | **ПРИНЯТО** — ноль зависимостей, полный контроль, ложится в registry-driven стиль                        |
| Cloudflare Access (Zero Trust, JWT из заголовка)     | отклонено как основной путь: завязка на CF-аккаунт, сложнее локальная разработка; кандидат при эскалации |
| Auth.js (next-auth) / Lucia                          | отклонено: OAuth-провайдеров для регистра всё равно нет, зависимость не оправдана                        |
| Публичная регистрация                                | **запрещено** (PII, клинический регистр)                                                                 |
| Инвайты через приложение (одноразовые токены-ссылки) | отложено (v1.5), после появления admin-UI                                                                |
| Регистрация по коду-ключу                            | отклонено: код пересылаемый, слабее инвайта                                                              |

## 3. Схема данных (migrations/0003_auth.sql, ручная миграция)

- `users`: `id` (UUID), `email` (UNIQUE, COLLATE NOCASE), `password_hash`,
  `display_name`, `role` CHECK IN (`admin` | `clinician` | `readonly`),
  `must_change_password` (0/1), `created_at`, `updated_at`.
- `sessions`: `id` = **SHA-256(токен)** hex (сам токен только в cookie),
  `user_id` FK ON DELETE CASCADE, `created_at`, `expires_at`, `user_agent`;
  индексы по `user_id` и `expires_at`.

## 4. Пароли (src/shared/lib/password.ts)

- **PBKDF2-SHA256** через `crypto.subtle`: 200 000 итераций (`PBKDF2_ITERATIONS`),
  соль 16 байт, длина ключа 256 бит. Работает в Workers и Node >= 18,
  один и тот же код в рантайме и в `scripts/create-user.ts`.
- Формат хэша: `pbkdf2$<iterations>$<salt-hex>$<hash-hex>` — параметры внутри
  строки, повышение итераций не ломает старые хэши.
- Проверка — constant-time сравнение (`verifyPassword`).
- Политика: минимум 10 символов; генерация пароля — 12 случайных байт base64url.
- Альтернативы bcrypt/argon2 недоступны нативно в Workers — зафиксировано.

## 5. Сессии (src/shared/api/session-repo.ts)

- **Токен**: 32 криптослучайных байта, base64url; живет ТОЛЬКО в cookie
  `rdd_session` (`HttpOnly; Secure; SameSite=Lax; path=/`). В БД — SHA-256(токен):
  утечка базы не угоняет сессии.
- **TTL 12 часов** (смена в клинике), sliding renewal: при остатке < 6 часов
  сессия продлевается до полных 12 ч при валидации.
- Истёкшие сессии удаляются при валидации; `purgeExpiredSessions` вызывается при
  логине. `destroySession` идемпотентен (logout).
- Cookie ставится в `loginAction` (`src/features/auth/actions.ts`), maxAge = TTL.

## 6. Вход/выход (src/features/auth)

- Server Actions `loginAction` / `logoutAction` ('use server').
- **Anti-enumeration**: одинаковая задержка 400 мс для несуществующего email и
  неверного пароля — существование учетки не раскрывается.
- `logoutAction` удаляет сессию из БД и cookie, redirect на `/login`.
- Форма — `ui/login-form.tsx` на `useActionState` (React 19); страница `app/login/page.tsx`.
- `session.ts` (features/auth): `getCurrentUser()` (null без редиректа) и
  `requireUser()` (redirect `/login`) — только server-окружение (next/headers).

## 7. Защита маршрутов (src/middleware.ts)

Двухуровневая модель:

1. **Middleware** — мгновенный redirect только по НАЛИЧИЮ cookie (без БД-запроса):
   нет cookie и не `/login` → `/login`; есть cookie и `/login` → `/matrix`.
   Полную валидацию токена middleware не делает.
2. **`requireUser()`** — полная валидация токена против D1 в server pages/actions.

Защищенные страницы — серверные обертки: `app/matrix/page.tsx` вызывает
`requireUser()` и рендерит клиентский `matrix-demo.tsx` + меню пользователя
(имя, роль, кнопка «Выйти» через `<form action={logoutAction}>`).

## 8. Роли

- `admin` — управление пользователями (будущее), доступ ко всему;
- `clinician` — чтение и запись клинических данных (по умолчанию);
- `readonly` — только чтение; проверка `canWrite(user)` (session-repo) —
  обязательна в будущих Server Actions/API мутаций.

## 9. Создание пользователей (scripts/create-user.ts)

Публичной регистрации нет. Два режима:

- `npm run user:create` — локальная БД через `getPlatformProxy`;
- `npm run user:create:remote` — прод через `wrangler d1 execute rdd --remote`
  (временный SQL-файл, подтверждение вводом `prod`, верификация записи после вставки).

- Интерактивный режим: email → имя → пароль (скрытый ввод, muted readline) +
  повтор; роль спрашивается со 2-го пользователя.
- **Первый пользователь всегда `admin`** (проверка COUNT(*) users).
- Неинтерактивный режим (CI): `--email --name --role --password` или
  `--gen-password` (пароль печатается один раз).
- Если таблицы users нет — подсказка применить миграции, вместо stack trace.
- Нюанс D1: `first(arg)` трактует аргумент как имя колонки, не биндинг —
  использовать `.bind(x).first()`.

## 10. Ручные миграции и db:restart

`0002_audit.sql` и `0003_auth.sql` — ручные (вне gen:d1). Список зашит в
`MANUAL_MIGRATIONS` в `scripts/db-restart.ts`: при ресете они временно выносятся
из migrations/, gen:d1 генерирует baseline как `0001_init.sql`, ручные
возвращаются и применяются ПОСЛЕ baseline (0002_audit содержит индексы по
tables реестра). Порядок «сначала move, потом delete» критичен.

## 11. Аудит (интеграция с docs/matrix.md §6.6)

`actor_id` в `audit_log` = `SessionUser.id`, берется из `requireUser()` /
`getCurrentUser()` в месте мутации и передается в `AuditEntry.actorId`.
Запись данных + аудит — один `db.batch`. Пока записи матрицы — демо (mock),
подстановка выполняется на месте будущих реальных Server Actions.

## 12. Известные ограничения и пороги эскалации

- **Rate-limit на login отсутствует** (только задержка 400 мс). Порог:
  при публичном доступе / подборе паролей — счетчик неудач в users +
  временная блокировка, либо Cloudflare WAF rate limiting.
- `must_change_password` заложен в схему, но сценарий смены пароля при первом
  входе и «забыл пароль» (сброс через create-user / инвайт) — TODO v1.5.
- Rotation ключей сессий не требуется (токены одноразовые случайные, хранится хэш).
- При эскалации на внешних пользователей — пересмотреть Cloudflare Access
  (см. §2) как SSO-слой поверх текущей сессии.

## 13. Как проверить вручную

1. `npm run dev` (локальный D1 уже с миграциями) или `npm run dev:cf`.
2. Открыть `/matrix` без cookie → redirect на `/login`.
3. Войти: `admin@test.local` (локальный тестовый, пароль из вывода `user:create`).
4. `/matrix` — меню с именем/ролью, «Выйти» → `/login`, cookie удалена.
