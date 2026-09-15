# Stage 2 spec: Patient entities and pages (./spec-stage-2.md)

**Status:** spec · **Dependencies:** stage 1 (real mutations)
**FSD layers:** `src/entities/patient`, `src/entities/phase` (new), `src/app/...` — pages
**Goal:** bring in real patients, bind the matrix to `patient_id`, close the rdd-v1.md §8 p.2 backlog (entities/app layers) and provide the first analytics.

---

## 1. Fixed decisions

| #   | Problem                     | Solution                                                                                                                         |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Where repositories live     | Move domain repos from `shared/api` to `entities/*/api`; `shared/api` remains infrastructure only (db, session-repo, audit-repo) |
| 2   | Navigation between patients | Server Components + App Router: `/patients`, `/patients/[id]/matrix`; reuse of `requireUser()`                                   |
| 3   | Aggregates                  | SQL over the registry columns (`gen:d1`-schema) — a static class `src/entities/phase/api/queries.ts`                             |
| 4   | Demo page `/matrix`         | Becomes `/patients/[id]/matrix`; without an id — redirect to the patient list                                                    |

## 2. `entities/patient` layer

- `src/entities/patient/api/patient-repo.ts` (move + extend):
  `list({ q?, limit, offset })`, `findById`, `create(input)`, `update(id, patch)`, `remove(id)` —
  with validation by the generated patient Zod schema and audit.
- `src/entities/patient/ui/patient-card.tsx`, `patients-table.tsx` — server/client
  card and table components (passport part from `REGISTRY.patient`).
- The layer's public API — only via `src/entities/patient/index.ts` (deep imports forbidden; checked by steiger).

## 3. `entities/phase` layer

- Move `phase-repo.ts` → `src/entities/phase/api/phase-repo.ts` (stage 1 contracts do not change).
- `queries.ts` — aggregates, each a parameterized SQL with bindings, no concatenation:
  - `countByField(fieldId, scope?)` — "how many patients with feature X" (the column exists by schema construction; `count` = number of DISTINCT patients);
  - `phaseDurationsByOrder(scope?)` — average durations of phases/intermissions;
  - `efficacyByMainComponent(scope?)` — efficacy of ADs (`ad_efficacy`) in the `main_component` breakdown.
  - `/reports` metrics (by phase): `averageOnsetAge` (disease onset age),
    `averageDiseaseDurationMonths` (disease duration), `averageDurations`
    (average phase/intermission durations), `firstToPenultimatePhaseDuration` /
    `firstToPenultimateIntermissionDuration` ("first → penultimate" dynamics,
    patients with at least 3 phases), `seasonalDistribution` (exacerbation season),
    `depressionSeverityDistribution` (depression severity — clinical attribute
    `depression_severity`: mild/moderate/severe, recorded in every phase),
    `mainComponentDistribution` (predominant component). Distributions
    severity/season/component count PHASES (episodes);
  - `/reports` metrics (by patient) — `src/entities/patient/api/patient-queries.ts`:
    `genderDistribution` (gender), `averageAgeAtInclusion` (average age),
    `familyHistoryDistribution` (hereditary mental burden).
- All aggregates respect the user's `data_scope` (the same row-level access as for lists).
- `fieldId` validator: only `FLAT_REGISTRY` keys with a phase scope are allowed (SQL-injection protection via the column name).

## 4. Pages (`src/app` / root `app/`)

| Route                   | Content                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `/patients`             | Patient table: search by id/inclusion date, pagination, "New patient" button (clinician+) |
| `/patients/new`         | Passport form: fields rendered from `REGISTRY.patient` by `field.ui`                      |
| `/patients/[id]`        | Patient card + phase list + "Matrix" button                                               |
| `/patients/[id]/matrix` | Grid (stage 1) with the patient's real phases, phase create/delete                        |
| `/reports`              | The simplest aggregates from §3 (tables), admin + clinician                               |

Form actions are Server Actions with `phaseSchema`/patient schema and `canWrite`.

## 5. Data migrations

- The schema does not change (patients/phases are already in `0001_init.sql`) — no migrations required.
- Optional: `scripts/seed-demo.ts` — 5–10 test patients with phases for local development (`npm run seed:demo`); for the prod DB — `npm run seed:demo:remote` (wrangler d1 execute --remote, "prod" confirmation or `--yes` flag).

## 6. Acceptance criteria

1. Creating a patient via `/patients/new`, appearing in the list, opening the matrix with an empty phase 1.
2. Matrix editing is saved to the DB and visible after F5 (end-to-end scenario of stages 1 + 2).
3. `/reports` returns correct aggregates on test data; the readonly role does not see write buttons.
4. `npm run steiger` — no import errors between entities.
