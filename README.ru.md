# RDD — Регистр депрессивных расстройств

Веб-приложение клинического регистра: паспорт пациента, матрица фаз заболевания (фармакотерапия, ремиссия, психический статус, шкалы), роли, аудит и аутентификация.

## Предыстория

Модель данных этого регистра основана на реальной научной работе: лонгитюдном исследовании рекуррентного депрессивного расстройства у пациентов позднего возраста (Институт Бехтерева, Санкт-Петербург, 2015 г.). Автор &mdash; к.м.н. по психиатрии.

Фазовая структура отслеживания, расчёты качества ремиссии и интеграция клинических шкал (HAM-D и др.) в этом коде напрямую отражают методологию сбора данных, использованную в этом исследовании — это не синтетическая модель.

Ссылка на [полный реферат диссертации](https://github.com/denzakh/rdd-late-life-thesis/blob/main/en/abstract/abstract.en.md)

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
| `npm run db:restart`   | полный ресет локальной БД (baseline + ручные миграции 0002–0007)      |
| `npm run db:migrate:*` | применить миграции (`--local` / `--remote`)                           |
| `npm run user:create`  | создать пользователя (интерактив/флаги; первый — admin)               |
| `npm run seed:demo`    | демо-данные                                                           |
| `npm run test`         | unit-тесты (Vitest)                                                   |
| `npm run test:db`      | интеграционные тесты на локальной D1                                  |
| `npm run lint`         | ESLint                                                                |
| `npm run steiger`      | проверка слоёв FSD                                                    |
| `npm run deploy`       | деплой в Cloudflare                                                   |

## Аутентификация и роли

- Собственные сессии на D1 (PBKDF2, токен только в HttpOnly cookie), TTL 12 ч
  (sliding), абсолютный потолок 7 дней с момента логина.
- Роли: `admin` (управление пользователями, `/admin/users`), `clinician`
  (чтение/запись), `readonly` (только чтение).
- Row-level access: переключатель `data_scope` у пользователя — «видит всех» /
  «свой центр» / «только назначенных ему пациентов» (см. `docs/ru/auth.md`).
- Смена пароля `/change-password`; rate-limit: 5 неверных паролей → блокировка 15 мин.
- Инвайты: admin выдаёт одноразовую ссылку `/invite/<token>` (7 дней).

## Документация

Документация ведётся в двух зеркальных наборах: `docs/ru/` (оригиналы) и `docs/en/`
(английские переводы). Начинать — с точки входа.

- `docs/ru/architecture-overview.md` — **точка входа**: ключевые архитектурные решения,
  security-сводка, границы демо-проекта
- `docs/diagrams/c4-overview.svg` — C4-диаграмма (System Context + Container)
- `docs/ru/rdd-v1.md` — ядро: архитектура, реестр полей, схема данных
- `docs/ru/auth.md` — аутентификация, роли, row-level access (`data_scope`)
- `docs/ru/matrix.md` — виджет «Матрица»: виртуализация, CAS-конфликты, аудит
- `docs/ru/export.md` — де-идентифицированный экспорт (csv/json/xlsx)
- `docs/ru/data-dictionary.md` — автогенерируемый словарь данных (страница `/data-dictionary`)
- `docs/ru/schema-evolution.md` — **эволюция схемы без миграций**: версионность протокола
  (`registry_versions` + `registry_version` на записи) живёт в генерируемом baseline
  `0001_init.sql`; схема меняется только через ресет БД (`npm run db:restart`).
  Экспорт несёт `registry_version` на строке + `meta.registryVersions`;
  `/data-dictionary` помечает `deprecated_since`-поля
- `docs/ru/roadmap.md` — план этапов (спеки `spec-stage-1..4.md`, все реализованы)
- `docs/ru/consent.md` — согласие пациента: дата и версия формы ИС фиксируются при
  включении, текст согласия вне системы, пороги эскалации
- `docs/ru/nfr.md` — нефункциональные требования: Availability, RTO/RPO, пороги производительности
- `docs/ru/threat-model.md` — threat model (STRIDE): угрозы по категориям с маппингом на security-сводку
- `docs/en/` — тот же набор на английском (`i18n.md` есть только в EN)

## Статус i18n

- UI-обвязка (кнопки, меню, формы аутентификации) — переключается RU/EN через cookie
  `rdd_locale`; `<LocaleSwitcher />` в меню пользователя (см. `docs/en/i18n.md`).
- `RegistryField.label` — `{ ru, en }` во всём реестре; резолвится через
  `fieldLabel(field, locale)` с RU-фолбэком.
- `RegistryOption.label` — `{ ru, en } | string`; резолвится через `optionLabel(opt, locale)`.
- Сознательно **вне scope** (задокументировано в `docs/en/i18n.md`): перевод
  исторических значений БД (там коды, не текст), клинически валидированный перевод
  оценочных шкал, RTL, правила множественного числа.

## Разработка

- CI: GitHub Actions — lint + tsc + steiger + unit/интеграционные тесты.
- Деплой ручной: `npm run deploy` (или `npm run preview` для локального CF-рантайма).
