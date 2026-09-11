# RDD (Registry-Driven Development) project — technical and career documentation

**Version:** 1.1

**Author:** Denis Zakharchenko

**Document purpose:** an end-to-end specification of the architecture, stack and business logic.

---

## 1. Overall context and project purpose

The project is a high-performance medical registry and analytics prototype for scientific research on depressive disorders.

- **Clinical entity:** the system structures and links clinical and pharmacotherapeutic features, tracking the dynamics of a patient's state across anamnestic and current phases (points 1..N, 98 — current status, 99 — exit).

- **Engineering purpose:** a Senior/Architect-level demonstration project, showing solutions to complex problems of type management, validation and computation on Edge infrastructure without heavy external dependencies.

---

## 2. Architecture and Edge infrastructure

### 2.1. Tech stack

- **Framework:** Next.js 16 (App Router, Server Actions). Mutations are transported by Server Actions; ZSA is not used in the stack (it is absent from `package.json`).

- **Runtime:** Cloudflare Workers / Pages via `@opennextjs/cloudflare` (`nodejs_compat` mode).

- **Methodology:** Feature-Sliced Design (FSD).
- **Validation & Types:** Zod, TypeScript (Strict mode)
- **Localization & Formatters:** native `Intl` API.

### 2.2. FSD layer configuration (`tsconfig.json`)

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

> The page module is in the root directory `app/` (standard create-next-app layout), not in `src/app/*`. The documentation files are stored in `docs/`.

---

## 3. System core: Registry (Single Source of Truth)

The architecture is built on the **Registry-driven development** principle: a single declared TS object is the source of truth for DB schemas, Zod validation, UI rendering and computations.

### 3.1. File structure (`src/shared/config/registry/`)

- `patient.ts`: passport part, social status, demographics, age computation.

- `status.ts`: mental status, objective symptoms, psychotic features.

- `therapy.ts`: pharmacotherapy (ADs, antipsychotics, tranquillizers, doses, routes of administration, reasons for change).

- `phase.ts`: time characteristics and phase-management logic.

- `remission.ts`: pathology signs in remission, prevention, pure-remission computation.

- `scales.ts`: scales (HAM-D, MMSE, Beck, clock drawing test).

- `types.ts`: base types (`UIComponent`, `RegistryField`, `RegistryBlock`).

- `index.ts`: assembly point. Exports the grouped `REGISTRY` (for UI) and the flat `FLAT_REGISTRY` (for API and Zod).

### 3.2. Base types (`types.ts`)

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
   * Optional: computed fields (calculate) and id-fields
   * of DB columns have none.
   */
  db_type?: 'INTEGER' | 'BOOLEAN' | 'TEXT' | 'DATE' | 'FLOAT'
  options?: RegistryOption[]
  min?: number
  max?: number
  is_current_only?: boolean
  /** Protocol version from which the field is taken out of use (./schema-evolution.md). */
  deprecated_since?: number
  /** id of the replacement field for a deprecated field (the "what replaced it" hint). */
  replacedBy?: string
  /** PII marker: the field is excluded/masked at the export de-identification step (./export.md). */
  pii?: boolean
  /**
   * Unified function contract: called with a row object
   * (row: Record<string, unknown>) => any. String specs of context-dependent
   * fields (e.g., phase number 'array_index + 1') are not executed here —
   * they are implemented in the UI layer (matrix).
   */
  calculate?: (row: Record<string, unknown>) => any
  scope?: 'patient' | 'phase'
}

export type RegistryBlock = Record<string, RegistryField>
```

Differences from version 1.0: `number-readonly`, `select-readonly`, `radio-group` added; `db_type` became optional; `min`/`max`, `deprecated_since`/`replacedBy` (protocol evolution, `./schema-evolution.md`) and `pii` (export de-identification, `./export.md`) added; the `calculate` contract was clarified; `RegistryOption.label` was widened to `{ ru, en } | string`.

---

## 4. Computations and Validation

### 4.1. Calculation logic (`src/shared/lib/intl/calculations.ts`)

Computations use native `Date` and `Intl` objects for guaranteed compatibility with V8 / Cloudflare Workers:

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

Additionally `getAgeGroup` is defined here (and its alias `map_age_to_group`) — the mapping of full years to an age group 1..5, used in `patient.ts`.

### 4.2. Dynamic Zod generator (`src/shared/lib/registry/to-zod.ts`)

The implementation is updated: validators are set by `db_type`, `min`/`max` from the registry are applied to numeric fields, all fields are declared `optional().nullable()` (there is no `required` in types):

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

### 4.3. Computed fields (`src/shared/api/with-computed.ts`)

The `calculate` functions from the registry are executed by the `applyComputed` engine, which enriches the stored DB row with derived fields. It filters only executable functions (string specs are ignored) and passes the accumulating object, so derived fields can depend on previously computed ones (e.g., `age_group` depends on `current_age`).

---

## 5. D1 Schema / Migration Generator

The migration generation tool is implemented in `src/shared/lib/registry/d1-schema.ts` + `scripts/gen-d1.ts` (`npm run gen:d1`).

- `db_type` → SQL mapping: `BOOLEAN → INTEGER (0/1)`, `DATE → TEXT (ISO-8601)`, `FLOAT → REAL`.
- Two tables: `patients` (system column `id`) and `phases` (`id`, `patient_id`, `phase_order_id` + `UNIQUE (patient_id, phase_order_id)`).
- The diff engine `computeDelta` compares the desired schema from the registry with the `.schema-snapshot.json` snapshot and generates safe `ADD COLUMN` / `RENAME COLUMN` operations.
- "Exotic" changes (type change, column delete/move) are not applied automatically — the script aborts with a description of the required manual intervention.
- Artifacts: `migrations/NNNN_*.sql` (sequential migrations), `schema-reference.sql` (the current baseline outside the `migrations` directory, because Wrangler applies all `*.sql` from `migrations/`), the snapshot `.schema-snapshot.json`.
- Protocol versioning (`registry_versions` + `patients`/`phases`.`registry_version`) — part of the generated baseline `0001_init.sql`, there is no separate migration: schema evolution only via DB reset (`npm run db:restart`). Details — `./schema-evolution.md` §4.

Typical schema change cycle: edit the registry → `npm run gen:d1` → `npm run db:restart` (locally), if necessary `npm run db:migrate:remote`.

---

## 6. Data access layer (`src/shared/api/`)

> Authentication and user management are moved to a separate spec:
> **`./auth.md`** (migration `0003_auth.sql`, `src/features/auth`, sessions on D1).

- `db.ts`: access to the `env.DB` binding via `getCloudflareContext()` (server-only environment).
- `rows.ts`: explicit `PatientRow` / `PhaseRow` row types, synced with the schema; contains type-safe registry-conformance checks.
- `patient-repo.ts` / `phase-repo.ts`: CRUD repositories (patients and phases; `phase_order_id` autoincrement).
- `with-computed.ts`: the `applyComputed` engine (section 4.3).

---

## 7. Storing binary features (architectural decision)

Rule: **the desired = the current = the documented decision; change only when the escalation threshold is reached.**

### 7.1. Current solution

Binary flag features are stored as a **flat column** of type `INTEGER 0/1` in the parent table (`phases`, less often `patients`):

```sql
"melancholy_obj"   INTEGER NULL,  -- melancholy, 0/1
"beta_blockers"    INTEGER NULL,  -- beta-blockers, 0/1
"apathy_obj"       INTEGER NULL,
...
```

Currently the registry has ~52 `BOOLEAN` flags:

- `therapy.ts` — 24,
- `status.ts` — 20,
- `remission.ts` — 7,
- `patient.ts` — 1 (in the `patients` table).

The type-safety source is `RegistryField.ui === 'checkbox'` + `db_type: 'BOOLEAN'`; the column is generated by the `d1-schema` engine automatically.

**Strengths:**

- feature aggregates/filters — a single `WHERE col = 1`, no JOIN;
- each flag is typed in `PatientRow`/`PhaseRow`, covered by the type-safe `rows.ts` checks;
- the registry remains the single source of truth: registry → schema → UI → validation;
- the diff-generator adds the column automatically.

**Weaknesses:**

- rapid table-width growth at hundreds of flags;
- unfilled flags push NULL through rows;
- a feature with a date/comment does not fit into a single bit.

### 7.2. Alternatives considered

At the flag-storage design stage the following schemes were compared (summary):

1. **Flat columns** `INTEGER 0/1` — accepted (see sections 7.1, 7.4).
2. **EAV** (`phase_flags(phase_id, flag_id, value)`) — extensibility and dynamic features, but complicates fetching the "whole phase" (PIVOT/GROUP_CONCAT), worse typing and aggregate performance; the registry stops being a direct schema.
3. **Bitmask** (single `INTEGER`/`BLOB`, bit = feature by registry index) — maximally compact and one `&` operator for any subset, but data readability is lost and per-column statistics are harder.
4. **JSON column** (D1 / SQLite JSON1: `sqlite ->>` / `JSON_EXTACT`, `json` function) — compact and convenient for self-contained blocks. **Rejected for the reasons below — section 7.3.**
5. **Hybrid** (key clinical features in columns, homogeneous groups — separate tables/JSON) — accepted as an **escalation threshold** (section 7.5).

### 7.3. Why the JSON option was not chosen

JSON in D1/SQLite is technically available (JSON1: `->>`, `json_extract`, `json_array_length`, etc.), but was deliberately rejected:

- **The registry nature of the schema.** The code is built so that "field = column": `d1-schema`, `rows.ts`, `to-zod`, repositories — everything is tied to the declared field set. A JSON block would switch fields out of this chain.
- **Form validation.** The Zod schema (`to-zod.ts`) is easy to generate from columns; for JSON one would have to maintain a separate block schema and duplicate field descriptions.
- **Foreign keys and medical-statistics queries.** Aggregating "how many patients with feature X" by JSON path works (`json_extract`), but reads worse, indexes heavier and catches name desync more readily than a materialized column.
- **Matrix/UI.** Conditional rendering by `field.ui` and per-line phase saving are simpler when every field is a real column of the row.
- **Summary:** JSON wins where a block is **integral and does not require individual queries** (a profile, a settings config). For a set of independent diagnostic flags, over which filters and aggregates are needed, flat columns win.

### 7.4. Arguments for the current decision

Flat columns were accepted because for this project:

- the features are **binary and without attributes**, and their set is stable;
- the main access pattern — **filters/aggregates by a single feature**;
- the registry-driven core and the diff-generator are already built around "field = column";
- the modern EAV/bitmask/JSON option gives no win at the current scale (~50 flags), but breaks typing and schema simplicity.

### 7.5. Escalation threshold

Reconsider the decision (migrate to a **hybrid**, section 7.2 p.5) if **at least one** of the following occurs:

- the number of binary phase features exceeds **~100–150 columns**;
- features with **attributes** appear (start date, comment, score/degree);
- a need arises for **dynamic/custom features**, not known when writing the registry.

---

## 8. Backlog and next steps for the AI executor

The backlog is moved to `./roadmap.md` (stages 1–4 with the specs `spec-stage-1..4.md`).
