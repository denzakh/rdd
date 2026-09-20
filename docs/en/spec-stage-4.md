# Stage 4 spec: Quality, tests and infrastructure (./spec-stage-4.md)

**Status:** spec · **Dependencies:** in parallel with stages 1–3 (stage 1 tests are mandatory before stage 2)
**Goal:** cover critical nodes with tests, add CI, tidy the repository (README, docs).

---

## 1. Fixed decisions

| #   | Problem     | Solution                                                                                     |
| --- | ----------- | -------------------------------------------------------------------------------------------- |
| 1   | Test runner | **Vitest** — the only new dev-dependency; edge-compatible utilities are tested in Node ≥ 18  |
| 2   | D1 in tests | `getPlatformProxy` (wrangler) + `npm run db:restart` — only for repository integration tests |
| 3   | E2E         | Deferred; instead — a smoke script against `npm run preview` (CF runtime)                    |
| 4   | CI          | GitHub Actions: lint + tsc + steiger + unit tests on every push/PR                           |

## 2. Unit tests (no DB)

| Module                                                   | Covered                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/shared/lib/registry/d1-schema.ts`                   | DDL generation: types by `db_type`, NOT NULL/PK, sync with `migrations/.schema-snapshot.json`                |
| `src/shared/lib/registry/to-zod.ts`                      | Validators by `db_type`, min/max from the registry, nullable/optional                                        |
| `src/shared/lib/password.ts`                             | Hash format `pbkdf2$…`, verify (right/wrong password), constant time not checked, but sanity-timings         |
| `src/shared/lib/intl/calculations.ts`                    | Age, pure remission, registry computed fields                                                                |
| `src/widgets/matrix/model/matrix-store.ts`               | setValue/markConflict/resolveConflict/clearConflicts; `subscribeDirty` — batch, 300 ms debounce, unsubscribe |
| `src/widgets/matrix/model/validate.ts`, `matrix-rows.ts` | conditional render logic, row assembly                                                                       |
| `src/shared/api/rows.ts`                                 | type-test of registry/rows sync (already partially by types — add a runtime smoke by snapshot)               |

## 3. Integration tests (local D1)

- Helper `tests/helpers/db.ts`: `getPlatformProxy` + applying migrations (order as in `db-restart.ts`).
- **Environment requirement:** the aggregate cases (`reports-*`, `consent-filter`, `patient-repo`) query data **across the whole local DB** (`{ mode: 'all' }`) and assert exact values, so they assume a fresh database: run `npm run db:restart` before `npm run test:db`. Demo data from `npm run seed:demo` inflates the counters and breaks such checks (CI uses an empty DB, so it does not show up there).
- Cases: `phase-repo` (create/nextOrderId/update/updateWithVersion: applied and conflict), `audit-repo`
  (insertBatch, queries), `session-repo` (create/validate/sliding renewal/delete expired),
  `patient-repo` CRUD. Script — `npm run test:db:watch` / `vitest tests/integration`.

## 4. CI (`.github/workflows/ci.yml`)

```yaml
# Node 22, npm ci
- npm run lint
- npx tsc --noEmit
- npm run steiger
- npx vitest run # unit
- npm run test:db # integration (wrangler platform proxy, local D1)
```

Secrets are not required (local D1). Deploy stays manual (`npm run deploy`).

## 5. Documentation and repo hygiene

1. **README.md** — rewrite: RDD project description, stack, FSD layout, commands (dev, dev:cf, gen:d1,
   db:restart, user:create, deploy), how to create the first admin and log in, links to `docs/`.
2. **./matrix.md** — update: zustand and @tanstack/react-virtual are already in package.json (remove the ⚠️),
   mark implemented sections; after stage 1 — add a section on real mutations.
3. **./rdd-v1.md §8** — replace the backlog with a link to `./roadmap.md`.
4. Add `./roadmap.md` to the root of docs navigation (the index of stage specs).

## 6. Acceptance criteria

1. `npx vitest run` — green locally and in CI; coverage of the key modules of §2 (target ≥80% by statements for `shared/lib`).
2. Integration tests pass on a clean local DB (`npm run db:restart && npm test`).
3. CI red on a lint/tsc/steiger/tests failure; green on the current main after wiring.
4. README reflects the real run process; the docs contain no stale statements about dependencies.
