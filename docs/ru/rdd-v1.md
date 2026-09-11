# Техническая и карьерная документация проекта RDD (Registry-Driven Development)

**Версия:** 1.1

**Автор:** Денис Захарченко

**Назначение документа:** Сквозная спецификация архитектуры, стека и бизнес-логики.

---

## 1. Общий контекст и назначение проекта

Проект представляет собой высокопроизводительный медицинский регистр и аналитический прототип для научных исследований депрессивных расстройств.

- **Клиническая сущность:** Система структурирует и связывает клинические и фармакотерапевтические признаки, отслеживая динамику состояния пациента по анамнестическим и текущим фазам (точки 1..N, 98 — текущий статус, 99 — выход).

- **Инженерное назначение:** Демонстрационный проект уровня Senior/Architect, показывающий решение сложных задач по управлению типами, валидации и вычислениям на Edge-инфраструктуре без тяжелых внешних зависимостей.

---

## 2. Архитектура и Edge-инфраструктура

### 2.1. Технологический стек

- **Framework:** Next.js 16 (App Router, Server Actions). Транспорт мутаций — Server Actions; ZSA в стеке не используется (в `package.json` его нет).

- **Runtime:** Cloudflare Workers / Pages via `@opennextjs/cloudflare` (режим `nodejs_compat`).

- **Methodology:** Feature-Sliced Design (FSD).
- **Validation & Types:** Zod, TypeScript (Strict mode)
- **Localization & Formatters:** Native `Intl` API.

### 2.2. Конфигурация слоев FSD (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "es2024",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"],
      "@app/*": ["./src/app/*"],
      "@pages/*": ["./src/pages/*"],
      "@widgets/*": ["./src/widgets/*"],
      "@features/*": ["./src/features/*"],
      "@entities/*": ["./src/entities/*"],
      "@shared/*": ["./src/shared/*"]
    }
  }
}
```

> Модуль страницы находится в корневом каталоге `app/` (стандартная компоновка create-next-app), а не в `src/app/*`. Файлы документации хранится в `docs/`.

---

## 3. Ядро системы: Registry (Single Source of Truth)

Архитектура построена по принципу **Registry-driven development**: единый декларируемый TS-объект выступает источником правды для схем БД, Zod-валидации, UI-рендеринга и вычислений.

### 3.1. Структура файлов (`src/shared/config/registry/`)

- `patient.ts`: Паспортная часть, социальный статус, демография, вычисление возраста.

- `status.ts`: Психический статус, объективные симптомы, психотика.

- `therapy.ts`: Фармакотерапия (АД, нейролептики, транквилизаторы, дозы, способы введения, причины смены).

- `phase.ts`: Временные характеристики и логика управления фазами.

- `remission.ts`: Признаки патологии в ремиссии, профилактика, вычисление чистой ремиссии.

- `scales.ts`: Шкалы (HAM-D, MMSE, Бек, тест рисования часов).

- `types.ts`: Базовые типы (`UIComponent`, `RegistryField`, `RegistryBlock`).

- `index.ts`: Точка сборки. Экспортирует сгруппированный `REGISTRY` (для UI) и плоский `FLAT_REGISTRY` (для API и Zod).

### 3.2. Базовые типы (`types.ts`)

```typescript
export type UIComponent =
  | 'text-input'
  | 'number-input'
  | 'checkbox'
  | 'select'
  | 'date-picker'
  | 'badge-readonly'
  | 'toggle-binary'
  | 'number-readonly'
  | 'select-readonly'
  | 'radio-group'

export interface RegistryOption {
  value: number | string
  label: { ru: string; en: string } | string
}

export interface RegistryField {
  id: string
  label: { ru: string; en: string } | string
  ui: UIComponent
  /**
   * Необязательный: вычисляемые поля (calculate) и id-поля
   * колонок БД не имеют.
   */
  db_type?: 'INTEGER' | 'BOOLEAN' | 'TEXT' | 'DATE' | 'FLOAT'
  options?: RegistryOption[]
  min?: number
  max?: number
  is_current_only?: boolean
  /** Версия протокола, с которой поле выведено из употребления (./schema-evolution.md). */
  deprecated_since?: number
  /** id поля-замены для deprecated-поля (подсказка «чем заменено»). */
  replacedBy?: string
  /** PII-метка: поле исключается/маскируется на шаге де-идентификации экспорта (./export.md). */
  pii?: boolean
  /**
   * Единый контракт функции: вызывается с объектом строки
   * (row: Record<string, unknown>) => any. Строковые спеки контекст-зависимых
   * полей (например, номер фазы 'array_index + 1') здесь не исполняются —
   * они реализуются в UI-слое (матрица).
   */
  calculate?: (row: Record<string, unknown>) => any
  scope?: 'patient' | 'phase'
}

export type RegistryBlock = Record<string, RegistryField>
```

Отличия от версии 1.0: добавлены `number-readonly`, `select-readonly`, `radio-group`; `db_type` стал опциональным; добавлены `min`/`max`, `deprecated_since`/`replacedBy` (эволюция протокола, `./schema-evolution.md`) и `pii` (де-идентификация экспорта, `./export.md`); уточнён контракт `calculate`; `RegistryOption.label` расширен до `{ ru, en } | string`.

---

## 4. Вычисления и Валидация

### 4.1. Логика расчетов (`src/shared/lib/intl/calculations.ts`)

Вычисления выполняются с использованием нативных объектов `Date` и `Intl` для гарантированной совместимости с V8 / Cloudflare Workers:

```typescript
export const diffYears = (
  dateStart: string | Date | number,
  dateEnd: string | Date | number
): number => {
  const start = new Date(dateStart)
  const end = new Date(dateEnd)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0

  let years = end.getFullYear() - start.getFullYear()
  const monthDiff = end.getMonth() - start.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < start.getDate())) {
    years--
  }
  return years > 0 ? years : 0
}

export const diffMonths = (dateStart: string | Date, dateEnd: string | Date): number => {
  const start = new Date(dateStart)
  const end = new Date(dateEnd)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0

  let months = (end.getFullYear() - start.getFullYear()) * 12
  months += end.getMonth() - start.getMonth()
  if (end.getDate() < start.getDate()) {
    months--
  }
  return months > 0 ? months : 0
}
```

Дополнительно здесь определена `getAgeGroup` (и её алиас `map_age_to_group`) — маппинг полных лет в возрастную группу 1..5, используемый в `patient.ts`.

### 4.2. Динамический генератор Zod (`src/shared/lib/registry/to-zod.ts`)

Реализация актуализирована: валидаторы задаются по `db_type`, для числовых полей применяются `min`/`max` из реестра, все поля объявлены `optional().nullable()` (поля `required` в типах не существует):

```typescript
import { z } from 'zod'
import { FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'

export const generateSchema = () => {
  const shape: Record<string, z.ZodTypeAny> = {}

  Object.entries(FLAT_REGISTRY).forEach(([key, value]) => {
    const field = value as RegistryField
    const dbType = field.db_type

    let validator: z.ZodTypeAny
    switch (dbType) {
      case 'BOOLEAN':
        validator = z.coerce.boolean()
        break
      case 'INTEGER':
      case 'FLOAT': {
        let n = z.number()
        if (field.min !== undefined) n = n.min(field.min)
        if (field.max !== undefined) n = n.max(field.max)
        validator = n
        break
      }
      case 'DATE':
        validator = z.union([z.date(), z.string().datetime().or(z.string())])
        break
      case 'TEXT':
        validator = z.string()
        break
      default:
        validator = z.any()
    }

    shape[key] = validator.optional().nullable()
  })

  return z.object(shape)
}

export const phaseSchema = generateSchema()
```

### 4.3. Вычисляемые поля (`src/shared/api/with-computed.ts`)

Функции `calculate` из реестра исполняются движком `applyComputed`, который обогащает хранимую строку БД производными полями. Он фильтрует только исполнимые функции (строковые спеки игнорируются) и передаёт накапливаемый объект, поэтому производные поля могут зависеть от ранее вычисленных (например, `age_group` зависит от `current_age`).

---

## 5. D1 Schema / Migration Generator

Инструмент генерации миграций реализован в `src/shared/lib/registry/d1-schema.ts` + `scripts/gen-d1.ts` (`npm run gen:d1`).

- Маппинг `db_type` → SQL: `BOOLEAN → INTEGER (0/1)`, `DATE → TEXT (ISO-8601)`, `FLOAT → REAL`.
- Две таблицы: `patients` (системная колонка `id`) и `phases` (`id`, `patient_id`, `phase_order_id` + `UNIQUE (patient_id, phase_order_id)`).
- Дифф-движок `computeDelta` сравнивает желаемую схему из реестра со снапшотом `.schema-snapshot.json` и генерирует безопасные операции `ADD COLUMN` / `RENAME COLUMN`.
- «Экзотические» изменения (смена типа, удаление/перенос колонки) автоматически не применяются — скрипт абортируется с описанием требуемого ручного вмешательства.
- Артефакты: `migrations/NNNN_*.sql` (последовательные миграции), `schema-reference.sql` (актуальный baseline вне каталога `migrations`, т.к. Wrangler применяет все `*.sql` из `migrations/`), снапшот `.schema-snapshot.json`.
- Версионность протокола (`registry_versions` + `patients`/`phases`.`registry_version`) — часть генерируемого baseline `0001_init.sql`, отдельной миграции нет: эволюция схемы только через ресет БД (`npm run db:restart`). Подробно — `./schema-evolution.md` §4.

Типичный цикл изменения схемы: отредактировать реестр → `npm run gen:d1` → `npm run db:restart` (локально), при необходимости `npm run db:migrate:remote`.

---

## 6. Слой доступа к данным (`src/shared/api/`)

> Аутентификация и управление пользователями вынесены в отдельную спеку:
> **`./auth.md`** (миграция `0003_auth.sql`, `src/features/auth`, сессии на D1).

- `db.ts`: доступ к binding'у `env.DB` через `getCloudflareContext()` (только server-окружение).
- `rows.ts`: явные типы строк `PatientRow` / `PhaseRow`, синхронизированные со схемой; содержит типобезопасные проверки соответствия реестру.
- `patient-repo.ts` / `phase-repo.ts`: CRUD-репозитории (пациенты и фазы; автоинкремент `phase_order_id`).
- `with-computed.ts`: движок `applyComputed` (раздел 4.3).
- Интеграционные проверки: `npm run test:db` (`scripts/test-db.ts`), окружение — D1 через `getPlatformProxy`.

---

## 7. Хранение бинарных признаков (архитектурное решение)

Правило: **желаемое = текущее = документированное решение; менять только при достижении порога эскалации.**

### 7.1. Текущее решение

Бинарные признаки-флаги хранятся **плоской колонкой** типа `INTEGER 0/1` в родительской таблице (`phases`, реже `patients`):

```sql
"melancholy_obj"   INTEGER NULL,  -- тоска, 0/1
"beta_blockers"    INTEGER NULL,  -- бета-блокаторы, 0/1
"apathy_obj"       INTEGER NULL,
...
```

На текущий момент в реестре ~52 `BOOLEAN`-флага:

- `therapy.ts` — 24,
- `status.ts` — 20,
- `remission.ts` — 7,
- `patient.ts` — 1 (в таблице `patients`).

Источник типобезопасности — `RegistryField.ui === 'checkbox'` + `db_type: 'BOOLEAN'`; колонка генерируется движком `d1-schema` автоматически.

**Сильные стороны:**

- агрегаты/фильтры по признаку — единичный `WHERE col = 1`, без JOIN;
- каждый флаг типизирован в `PatientRow`/`PhaseRow`, покрыт типобезопасными проверками `rows.ts`;
- регистр остаётся единственным источником правды: реестр → схема → UI → валидация;
- diff-генератор автоматически добавляет колонку.

**Слабые стороны:**

- быстрый рост ширины таблицы при сотнях флагов;
- незаполненные флаги гоняют NULL по строкам;
- признак с датой/комментарием не вмещается в один бит.

### 7.2. Рассмотренные альтернативы

На этапе проектирования хранения флагов сравнивались следующие схемы (сводно):

1. **Плоские колонки** `INTEGER 0/1` — принято (см. раздел 7.1, 7.4).
2. **EAV** (`phase_flags(phase_id, flag_id, value)`) — расширяемость и динамические признаки, но усложняет выборку «всей фазы» (PIVOT/GROUP_CONCAT), хуже типизация и производительность агрегатов; реестр перестаёт быть прямой схемой.
3. **Битовая маска** (один `INTEGER`/`BLOB`, бит = признак по индексу реестра) — максимально компактно и один оператор `&` для любого подмножества, но теряется читаемость данных и усложняется статистика по отдельным колонкам.
4. **JSON-колонка** (D1 / SQLite JSON1: `sqlite ->>` / `JSON_EXTACT`, функция `json`) — компактно и удобно для self-contained блоков. **Отклонено по приведённым ниже причинам — раздел 7.3.**
5. **Гибрид** (ключевая клиника в колонках, однотипные группы — отдельные таблицы/JSON) — принято как **порог эскалации** (раздел 7.5).

### 7.3. Почему не выбран JSON-вариант

JSON в D1/SQLite технически доступен (JSON1: `->>`, `json_extract`, `json_array_length` и т.д.), но отклонён намеренно:

- **Реестровая природа схемы.** Код построен так, что «поле = колонка»: `d1-schema`, `rows.ts`, `to-zod`, репозитории — всё завязано на декларируемый набор полей. JSON-блок выключил бы поля из этой цепочки.
- **Валидация формы.** Zod-схему (`to-zod.ts`) легко генерировать по колонкам; для JSON пришлось бы вести отдельную схему блока и дублировать описание полей.
- **Внешние ключи и запросы мед. статистики.** Агрегация «сколько пациентов с признаком X» по JSON-пути работает (`json_extract`), но хуже читается, тяжелее индексируется и охотнее ловит рассинхрон имён, чем материализованная колонка.
- **Матрица/UI.** Условный рендер по `field.ui` и построчное сохранение фаз проще, когда каждое поле — реальная колонка строки.
- **Итого:** JSON выигрывает там, где блок **целостный и не требует индивидуальных запросов** (профиль, настроечный конфиг). Для набора независимых диагностических флагов, по которым нужны фильтры и агрегаты, плоские колонки выигрывают.

### 7.4. Аргументы выбора текущего решения

Приняты плоские колонки, потому что для данного проекта:

- признаки **бинарны и без атрибутов**, а их набор стабилен;
- главный паттерн доступа — **фильтры/агрегаты по отдельному признаку**;
- registry-driven core и diff-генератор уже построены вокруг «поле = колонка»;
- современный вариант EAV/битовая маска/JSON не дают выигрыша на текущем масштабе (~50 флагов), но ломают типизацию и простоту схемы.

### 7.5. Порог эскалации

Пересмотреть решение (мигрировать к **гибриду**, раздел 7.2 п.5), если наступит **хотя бы одно** из:

- число бинарных признаков фазы превысит **~100–150 колонок**;
- появятся признаки с **атрибутами** (дата начала, комментарий, оценка/степень);
- возникнет потребность в **динамических/пользовательских признаках**, не известных на этапе написания реестра.

---

## 8. Бэклог и следующие шаги для ИИ-исполнителя

Бэклог перенесён в `./roadmap.md` (этапы 1–4 со спеками `spec-stage-1..4.md`).
