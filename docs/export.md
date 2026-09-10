# Экспорт де-идентифицированного датасета (docs/export.md)

**Задача исследователя:** не работать в UI, а получить выгрузку для статистики
(R/Python), где нет прямых идентификаторов пациента.

## 1. Два слоя: агрегация → сериализация

Не строим три экспортёра с нуля. Слои разделены:

- **Слой агрегации** — `getDeidentifiedDataset()` в
  `src/entities/phase/api/queries.ts`. Возвращает нейтральные TS-объекты
  `{ rows, columns, meta }`. Это единственное место с бизнес-логикой
  и k-anonymity (см. §3). Сюда же входят уже существующие агрегаты
  `countByField`, `phaseDurationsByOrder`, `efficacyByMainComponent` —
  они разделяют с экспортом тот же инвариант (scope + подавление малых ячеек).
- **Слой сериализации** — тонкие адаптеры в `src/shared/lib/export/`
  поверх одних и тех же агрегатов: `toCsv`, `toJson` (`serializers.ts`),
  `toXlsx` (`xlsx.ts`, без зависимостей — stored ZIP + inline strings).
  Каждый адаптер — ~20–30 строк: вся сложность уже посчитана.

Это то же решение, что «поле = колонка» из ядра реестра: **один источник
правды — несколько представлений.** Принцип системный, а не разовый:
там, где есть развилка «как отдать данные наружу», сначала один
нейтральный датасет, затем тонкие представления.

## 2. Server Action

`exportDeidentified(format: 'csv' | 'json' | 'xlsx')` —
`src/features/reports/api/actions.ts`. Только auth (`requireUser()`),
scope (`patientScopeFor(user)` — тот же row-level access, что у списков),
выбор адаптера и аудит (`export:deidentified`). Возвращает
`{ mime, filename, base64, ...meta }` — Action не может вернуть Response,
поэтому клиент (`ExportPanel`) скачивает base64 через Blob.
UI: панель на `/reports` (`src/features/reports/ui/export-panel.tsx`).

## 3. Де-идентификация (на шаге агрегации, не сериализации)

**Инвариант: PII фильтруется один раз, до того как данные попадут в любой
формат, а не отдельно в каждом экспортёре.** Иначе новый формат забудет
продублировать маскирование — классическая дыра.

- `id` → `seq_id` (sequence-номер исследования, 1..N по order id);
- поля реестра с `pii: true` (`study_entry_date`, `birth_year`,
  `phase_start_date` — см. `src/shared/config/registry/types.ts`)
  автоматически исключаются из SELECT; вместо них только `age_group`
  (1..5, из `getAgeGroup`) и `phase_start_diff_months` (`diffMonths`
  от даты включения, не абсолютные даты);
- списки колонок строятся из реестра (`PATIENT_EXPORT_COLUMNS`,
  `EXPORT_PHASE_COLUMNS`), а не захардкожены: новое поле без `pii`
  попадёт в экспорт само, поле с `pii: true` — никогда;
- **k-anonymity:** ключ группы — `(age_group, gender, phase_order_id)`;
  строки групп размером < `K_ANONYMITY_K` (5) подавляются,
  счётчик — `meta.suppressedRows`;
- **агрегаты `/reports`** (`countByField`, `phaseDurationsByOrder`, `efficacyByMainComponent`)
  следуют тому же инварианту: уважают `data_scope` пользователя и подавляют ячейки
  с числом пациентов < `K_ANONYMITY_K` — иначе малые группы (count=1..2) деанонимизируются
  через differencing attack;
- согласие: `consent_withdrawn_at IS NOT NULL` — исключены из выборки
  (данные не удаляются); scope пользователя уважается.
- **версионность протокола** (docs/schema-evolution.md §6): каждая строка несёт
  `registry_version` (метка CRF на момент сбора фазы), `columns` включают
  `registry_version` сразу после `seq_id`, а `meta.registryVersions` — список
  версий, представленных в выгрузке. Без метки смешение кодов разных версий
  одной шкалы даёт незаметный статистический артефакт.

## 4. Добавление нового формата

Написать адаптер `toNew(data: DeidentifiedDataset)` в
`src/shared/lib/export/` поверх `data.rows`/`data.columns` и ветку
в `exportDeidentified`. Маскирование дублировать **запрещено** —
оно уже выполнено в `getDeidentifiedDataset`.
