# Data Dictionary (./data-dictionary.md)

An auto-generated data dictionary of the registry. The **`/data-dictionary`** page renders
the table "field → type → allowed values → DB source" directly from the field registry —
the single source of truth of the application.

## How it works

- Source: `src/shared/config/registry` (`REGISTRY` — 6 sections: patient passport,
  phase control, remission, mental status, therapy, scales).
- Data assembly: `buildDataDictionary()` in
  `src/shared/lib/registry/data-dictionary.ts`. For each registry field
  (`RegistryField`) it computes:
  - `id`, `label` (ru) — from the registry;
  - `db_type` and the corresponding D1 SQL type (`DB_TYPE_TO_SQL`: `BOOLEAN` →
    `INTEGER` (0/1), `DATE` → `TEXT` (ISO-8601), `FLOAT` → `REAL`);
  - allowed values: `options` (encoding), `min`/`max` (range), for
    `BOOLEAN` — 0/1;
  - DB source: `patients.<id>` (scope `patient`), `phases.<id>` (scope
    `phase`) or "not stored" for computed fields (`calculate`).
- Page: `app/data-dictionary/page.tsx` (server component, `requireUser()`).
  There are no hand-written descriptions — the dictionary is always in sync with the registry
  and the generated D1 schema (`npm run gen:d1`, `./matrix.md`, `./rdd-v1.md`).

## Table reading rules

- **NULL** — the field value is not filled (columns are created as `NULL`).
- "current status only" — a field with `is_current_only`: available only in columns
  98 (current status) and 99 (exit) of the matrix.
- "computed" — a field with no DB column, the value is calculated on the fly
  (`src/shared/api/with-computed`), e.g. `current_age`, `age_group`,
  `hamd_severity`.
- "deprecated since vN" — the field was taken out of use by a protocol amendment
  (`deprecated_since` in the registry, ./schema-evolution.md §3, §6): the column
  stays in the schema and remains readable, the dictionary shows the marker and does not
  silently delete it.
- Categorical value encoding — numeric `options` codes from the registry;
  they are also used on export for biostatistics.

## Links

- Link to the page — from the patient list (`/patients`, "Data Dictionary").
- Registry as the schema source: `./architecture-overview.md`,
  `./rdd-v1.md` §3.2.
