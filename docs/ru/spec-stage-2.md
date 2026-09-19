# Спека этапа 2: Сущности и страницы пациента (./spec-stage-2.md)

**Статус:** спека · **Зависимости:** этап 1 (реальные мутации)
**Слои FSD:** `src/entities/patient`, `src/entities/phase` (новые), `src/app/...` — страницы
**Цель:** завести настоящих пациентов, привязать матрицу к `patient_id`, закрыть бэклог rdd-v1.md §8 п.2 (слои entities/app) и дать первую аналитику.

---

## 1. Зафиксированные решения

| #   | Проблема                   | Решение                                                                                                                                |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Где живут репозитории      | Перенести доменные репо из `shared/api` в `entities/*/api`; `shared/api` остаётся только инфраструктура (db, session-repo, audit-repo) |
| 2   | Навигация между пациентами | Server Components + App Router: `/patients`, `/patients/[id]/matrix`; переиспользование `requireUser()`                                |
| 3   | Агрегаты                   | SQL по колонкам реестра (`gen:d1`-схема) — статический класс `src/entities/phase/api/queries.ts`                                       |
| 4   | Демо-страница `/matrix`    | Становится `/patients/[id]/matrix`; без id — редирект на список пациентов                                                              |

## 2. Слой `entities/patient`

- `src/entities/patient/api/patient-repo.ts` (перенос + расширение):
  `list({ q?, limit, offset })`, `findById`, `create(input)`, `update(id, patch)`, `remove(id)` —
  с валидацией по сгенерированной пациентской Zod-схеме и аудитом.
- `src/entities/patient/ui/patient-card.tsx`, `patients-table.tsx` — серверные/клиентские
  компоненты карточки и таблицы (паспортная часть из `REGISTRY.patient`).
- Публичное API слоя — только через `src/entities/patient/index.ts` (импорты из глубины запрещены; проверяется steiger).

## 3. Слой `entities/phase`

- Перенос `phase-repo.ts` → `src/entities/phase/api/phase-repo.ts` (контракты этапа 1 не меняются).
- `queries.ts` — агрегаты, каждый — параметризованный SQL с биндингами, без конкатенации:
  - `countByField(fieldId, scope?)` — «сколько пациентов с признаком X» (колонка существует по построению схемы; `count` = число РАЗНЫХ пациентов);
  - `phaseDurationsByOrder(scope?)` — средние длительности фаз/интермиссий;
  - `efficacyByMainComponent(scope?)` — эффективность АД (`ad_efficacy`) в разрезе `main_component`.
  - показатели /reports (по фазам): `averageOnsetAge` (возраст начала заболевания),
    `averageDiseaseDurationMonths` (длительность заболевания), `averageDurations`
    (средние длительности фаз/интермиссий), `firstToPenultimatePhaseDuration` /
    `firstToPenultimateIntermissionDuration` (динамика «первая → предпоследняя»,
    пациенты с минимум 3 фазами), `seasonalDistribution` (сезон начала обострения),
    `depressionSeverityDistribution` (тяжесть депрессии — клинический признак
    `depression_severity`: лёгкая/умеренная/тяжёлая, заполняется в каждой фазе),
    `mainComponentDistribution` (преобладающий компонент). Распределения
    severity/season/component считаются числом ФАЗ (эпизодов);
    `binaryFeatureDistributions` — все бинарные признаки фаз (0/1-колонки
    реестра фаз: `db_type: 'BOOLEAN'` без вычисляемых полей и patient-scope)
    ОДНИМ запросом с условной агрегацией (`SUM(CASE WHEN col = 1 ...)` +
    `COUNT(col)`); число ФАЗ с «да» и знаменатель — заполненные фазы; вывод —
    таблицы «да/нет» на /reports, разбитые по секциям реестра (status /
    therapy / remission в порядке матрицы) и подгруппам THERAPY_GROUPS
    (`src/features/reports/ui/binary-features-section.tsx`);
  - показатели /reports (по пациентам) — `src/entities/patient/api/patient-queries.ts`:
    `genderDistribution` (пол), `averageAgeAtInclusion` (средний возраст),
    `familyHistoryDistribution` (наследственная отягощённость).
- Все агрегаты уважают `data_scope` пользователя (тот же row-level access, что у списков).
- Служебные фазы 98 («Поступление») и 99 («Выписка») исключены из всех агрегатов: в статистику /reports попадают только обычные эпизоды (1..97).
- Валидатор `fieldId`: разрешены только ключи `FLAT_REGISTRY` со scope фазы (защита от SQL-инъекции через имя колонки).

## 4. Страницы (`src/app` / корневой `app/`)

| Маршрут                 | Содержимое                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/patients`             | Таблица пациентов: поиск по id/дате включения, пагинация, кнопка «Новый пациент» (clinician+)                      |
| `/patients/new`         | Форма паспортной части: поля рендерятся из `REGISTRY.patient` по `field.ui`                                        |
| `/patients/[id]`        | Карточка пациента + список фаз + кнопка «Матрица»                                                                  |
| `/patients/[id]/matrix` | Грид (этап 1) с реальными фазами пациента, создание/удаление фаз                                                   |
| `/reports`              | Простейшие агрегаты из §3 (таблицы; пол, тяжесть, компонент и сезонность — секторные диаграммы), admin + clinician |

Действия форм — Server Actions с `phaseSchema`/patient-схемой и `canWrite`.

## 5. Миграции данных

- Схема не меняется (patients/phases уже в `0001_init.sql`) — миграций не требуется.
- Опционально: `scripts/seed-demo.ts` — 5–10 тестовых пациентов с фазами для локальной разработки (`npm run seed:demo`); для прод-БД — `npm run seed:demo:remote` (wrangler d1 execute --remote, подтверждение «prod» или флаг `--yes`).

## 6. Критерии приёмки

1. Создание пациента через `/patients/new`, появление в списке, открытие матрицы с пустой фазой 1.
2. Редактирование матрицы сохраняется в БД и видно после F5 (сквозной сценарий этапа 1 + 2).
3. `/reports` отдаёт корректные агрегаты по тестовым данным; readonly-роль не видит кнопок записи.
4. `npm run steiger` — без ошибок импортов между сущностями.
