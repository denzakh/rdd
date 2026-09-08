# RDD — Регистр депрессивных расстройств

Веб-приложение клинического регистра: паспорт пациента, матрица фаз заболевания (фармакотерапия, ремиссия, психический статус, шкалы), роли, аудит и аутентификация.

## Стек

- **Next.js 16** (App Router, React 19, Server Actions) + TypeScript (strict)
- **Cloudflare Pages/Workers** (`@opennextjs/cloudflare`), БД — **Cloudflare D1** (SQLite)
- Tailwind CSS 4, zustand, @tanstack/react-virtual, zod
- FSD-архитектура: `app/` (страницы) + `src/{app,widgets,features,entities,shared}`
- Тесты — Vitest (unit + интеграционные на локальной D1)

## Быстрый старт

```bash
npm ci
npm run db:restart          # пересоздать локальную D1 из реестра + ручные миграции
npm run user:create         # первый пользователь автоматически получает роль admin
npm run dev                 # http://localhost:3000
```

Вход: `/login` (email + пароль из `user:create`). Защищённые страницы редиректят
неавторизованных на `/login` (middleware + `requireUser()`).

## Команды

| Команда                | Назначение                                                            |
| ---------------------- | --------------------------------------------------------------------- |
| `npm run dev`          | dev-сервер Next (локальная D1 через `getPlatformProxy`)               |
| `npm run dev:cf`       | dev в Cloudflare-рантайме (worker.js)                                 |
| `npm run build`        | прод-сборка                                                           |
| `npm run gen:d1`       | генерация миграций D1 из реестра полей (`src/shared/config/registry`) |
| `npm run db:restart`   | полный ресет локальной БД (baseline + ручные миграции 0002–0005)      |
| `npm run db:migrate:*` | применить миграции (`--local` / `--remote`)                           |
| `npm run user:create`  | создать пользователя (интерактив/флаги; первый — admin)               |
| `npm run seed:demo`    | демо-данные                                                           |
| `npm run test`         | unit-тесты (Vitest)                                                   |
| `npm run test:db`      | интеграционные тесты на локальной D1                                  |
| `npm run lint`         | ESLint                                                                |
| `npm run steiger`      | проверка слоёв FSD                                                    |
| `npm run deploy`       | деплой в Cloudflare                                                   |

## Аутентификация и роли

- Собственные сессии на D1 (PBKDF2, токен только в HttpOnly cookie), TTL 12 ч.
- Роли: `admin` (управление пользователями, `/admin/users`), `clinician`
  (чтение/запись), `readonly` (только чтение).
- Row-level access: переключатель `data_scope` у пользователя — «видит всех» /
  «свой центр» / «только назначенных ему пациентов» (см. `docs/auth.md`).
- Смена пароля `/change-password`; rate-limit: 5 неверных паролей → блокировка 15 мин.
- Инвайты: admin выдаёт одноразовую ссылку `/invite/<token>` (7 дней).

## Документация

- `docs/architecture-overview.md` — **точка входа**: ключевые архитектурные решения,
  security-сводка, границы демо-проекта
- `docs/rdd-v1.md` — архитектура, реестр полей, схема данных
- `docs/auth.md` — аутентификация (v1.5 реализована)
- `docs/matrix.md` — виджет «Матрица»
- `docs/data-dictionary.md` — автогенерируемый словарь данных (страница `/data-dictionary`)
- `docs/roadmap.md` — план этапов (спеки `spec-stage-1..4.md`, все реализованы)

## Разработка

- CI: GitHub Actions — lint + tsc + steiger + unit/интеграционные тесты.
- Деплой ручной: `npm run deploy` (или `npm run preview` для локального CF-рантайма).
