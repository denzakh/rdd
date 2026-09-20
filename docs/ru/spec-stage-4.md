# Спека этапа 4: Качество, тесты и инфраструктура (./spec-stage-4.md)

**Статус:** спека · **Зависимости:** параллельно этапам 1–3 (тесты этапа 1 обязательны до этапа 2)
**Цель:** покрыть критичные узлы тестами, добавить CI, привести репозиторий в порядок (README, docs).

---

## 1. Зафиксированные решения

| #   | Проблема    | Решение                                                                                              |
| --- | ----------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Тест-раннер | **Vitest** — единственная новая dev-зависимость; edge-совместимые утилиты тестируются в Node ≥ 18    |
| 2   | D1 в тестах | `getPlatformProxy` (wrangler) + `npm run db:restart` — только для интеграционных тестов репозиториев |
| 3   | E2E         | Отложено; вместо него — smoke-скрипт против `npm run preview` (CF-рантайм)                           |
| 4   | CI          | GitHub Actions: lint + tsc + steiger + unit-тесты на каждый push/PR                                  |

## 2. Unit-тесты (без БД)

| Модуль                                                   | Покрываемое                                                                                               |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/shared/lib/registry/d1-schema.ts`                   | Генерация DDL: типы по `db_type`, NOT NULL/PK, синхронность с `migrations/.schema-snapshot.json`          |
| `src/shared/lib/registry/to-zod.ts`                      | Валидаторы по `db_type`, min/max из реестра, nullable/optional                                            |
| `src/shared/lib/password.ts`                             | Хэш-формат `pbkdf2$…`, verify (верный/неверный пароль), постоянное время не проверяем, но sanity-тайминги |
| `src/shared/lib/intl/calculations.ts`                    | Возраст, чистая ремиссия, вычисляемые поля реестра                                                        |
| `src/widgets/matrix/model/matrix-store.ts`               | setValue/markConflict/resolveConflict/clearConflicts; `subscribeDirty` — батч, дебаунс 300 мс, отписка    |
| `src/widgets/matrix/model/validate.ts`, `matrix-rows.ts` | условный рендер-логика, сборка строк                                                                      |
| `src/shared/api/rows.ts`                                 | type-тест синхронности реестра и строк (уже частично типами — добавить runtime-смоук по snapshot)         |

## 3. Интеграционные тесты (локальная D1)

- Хелпер `tests/helpers/db.ts`: `getPlatformProxy` + применение миграций (порядок как в `db-restart.ts`).
- **Требование к окружению:** агрегатные кейсы (`reports-*`, `consent-filter`, `patient-repo`) считают данные **по всей локальной БД** (`{ mode: 'all' }`) и сверяют точные значения, поэтому предполагают свежую базу: `npm run db:restart` перед `npm run test:db`. Демо-данные из `npm run seed:demo` завышают счётчики и ломают такие проверки (в CI база пустая — там это не проявляется).
- Кейсы: `phase-repo` (create/nextOrderId/update/updateWithVersion: applied и конфликт), `audit-repo`
  (insertBatch, выборки), `session-repo` (создание/валидация/sliding renewal/удаление истёкших),
  `patient-repo` CRUD. Скрипт — `npm run test:db:watch` / `vitest tests/integration`.

## 4. CI (`.github/workflows/ci.yml`)

```yaml
# Node 22, npm ci
- npm run lint
- npx tsc --noEmit
- npm run steiger
- npx vitest run # unit
- npm run test:db # интеграционные (wrangler platform proxy, локальная D1)
```

Secrets не требуются (D1 локальная). Деплой остаётся ручным (`npm run deploy`).

## 5. Документация и порядок в репо

1. **README.md** — переписать: описание проекта RDD, стек, FSD-схема, команды (dev, dev:cf, gen:d1,
   db:restart, user:create, deploy), как создать первого админа и войти, ссылки на `docs/`.
2. **./matrix.md** — актуализировать: zustand и @tanstack/react-virtual уже в package.json (снять ⚠️),
   отметить реализованные разделы; после этапа 1 — дописать раздел про реальные мутации.
3. **./rdd-v1.md §8** — бэклог заменить ссылкой на `./roadmap.md`.
4. Добавить `./roadmap.md` в корень навигации docs (индекс спек этапов).

## 6. Критерии приёмки

1. `npx vitest run` — зелёный локально и в CI; покрытие ключевых модулей §2 (ориентир ≥80% по statements для `shared/lib`).
2. Интеграционные тесты проходят на чистой локальной БД (`npm run db:restart && npm test`).
3. CI красный при падении lint/tsc/steiger/tests; зелёный — на текущем main после подключения.
4. README отражает реальный процесс запуска; docs не содержат устаревших утверждений о зависимостях.
