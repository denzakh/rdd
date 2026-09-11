# Спека этапа 3: Auth v1.5 (docs/spec-stage-3.md)

**Статус:** спека · **Зависимости:** этап 2 (admin-UI опирается на страницы)
**Слои FSD:** `src/features/auth`, `src/features/users`, `src/shared/api/session-repo.ts`, `scripts/`
**Цель:** закрыть TODO из docs/auth.md §12 — смена пароля, rate-limit, admin-UI, инвайты.

---

## 1. Зафиксированные решения

| #   | Проблема               | Решение                                                                                               |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | Rate-limit             | Собственный: счётчики неудачных попыток в `users` + временная блокировка (без KV — мин. зависимостей) |
| 2   | Смена пароля           | Server Action; `must_change_password=1` → принудительный редирект на `/change-password`               |
| 3   | Admin-UI пользователей | Страница `/admin/users` (только role=admin), Server Actions создания/блокировки/сброса                |
| 4   | Инвайты                | Одноразовый токен-ссылка (v1.5 из auth.md §2): таблица `invites`, ссылка выдаётся из admin-UI         |
| 5   | Регистрация            | По-прежнему запрещена; единственный путь — инвайт или скрипт `user:create`                            |

## 2. Миграция `0004_auth_v15.sql` (ручная, добавить в `MANUAL_MIGRATIONS` в `scripts/db-restart.ts`)

```sql
ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TEXT;            -- ISO, NULL = не заблокирован
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
```

## 3. Rate-limit на вход (auth.md §12, порог наступил)

- `loginAction`: при неудаче — `failed_attempts += 1`; при `>= 5` — `locked_until = now + 15 min`.
- До истечения `locked_until` вход отклоняется без проверки пароля (сообщение «Аккаунт временно заблокирован»).
- Успешный вход сбрасывает `failed_attempts` и `locked_until`.
- Дополнительно: постоянная задержка 400 мс сохраняется; при эскалации — WAF/Cloudflare (вне кода).

## 4. Смена пароля

- Страница `/change-password`: поля «текущий», «новый», «повтор»; политика ≥10 символов — та же, что в `password.ts`.
- Server Action `changePasswordAction`: `verifyPassword` → PBKDF2-хэш нового → UPDATE + `must_change_password = 0`
  → инвалидируются все прочие сессии пользователя (DELETE из `sessions` по `user_id`, кроме текущей).
- `requireUser()` при `must_change_password=1` и маршруте ≠ `/change-password`, `/login` → `redirect('/change-password')`.
- «Забыл пароль» — вне приложения: admin сбрасывает через admin-UI (§5), генерируя одноразовый пароль.

## 5. Admin-UI (`/admin/users`, role=admin, проверка на сервере)

- Таблица пользователей: email, имя, роль, флаг блокировки, дата создания.
- Действия (Server Actions, каждое пишет запись в `audit_log` с `actor_id`):
  - `createUser` — как `user:create`, но в приложении; пароль генерируется и показывается один раз;
  - `changeRole`, `lock/unlock` (`locked_until` вручную), `resetPassword` (генерация + `must_change_password = 1`);
  - self-защита: admin не может понизить/заблокировать сам себя (последний admin).
- `scripts/create-user.ts` сохраняется для локальной разработки и CI.

## 6. Инвайты

- Admin создаёт инвайт (email + роль) → генерируется токен (32 байта base64url), в БД — только SHA-256;
  ссылка `/invite/<token>` показывается админу один раз.
- Страница `/invite/<token>`: валидация (существует, не использован, не истёк) → форма установки имени и пароля
  → создание `users` → `used_at`, авто-логин.
- Срок жизни 7 дней; список активных инвайтов и отзыв — в admin-UI.

## 7. Критерии приёмки

1. 5 неверных паролей → блокировка на 15 минут, разблокировка успешным входом после истечения / admin-ом.
2. `must_change_password=1` → при входе принудительный редирект, после смены — обычная работа; другие сессии разлогинены.
3. Non-admin не имеет доступа к `/admin/users` (404/redirect, не только скрытие UI).
4. Инвайт: полный цикл — выдача, регистрация по ссылке, повторное использование отклоняется.
5. Все мутации пользователей видны в `audit_log`.
