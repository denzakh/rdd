# Stage 1 spec: Real matrix data mutations (./spec-stage-1.md)

**Status:** spec · **Dependencies:** auth (done), matrix-widget (done), phase-repo (done)
**FSD layer:** `src/features/matrix` (new) + rework of `app/matrix/`
**Goal:** remove the demo mock from `app/matrix/matrix-demo.tsx` — data is read from D1 via
`phase-repo.listByPatient`, changes are written by Server Actions with CAS, validation and audit.

---

## 1. Fixed decisions

| #   | Problem                   | Solution                                                                                      |
| --- | ------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | Client → server transport | Server Actions (`'use server'`), no REST routes; called from the `subscribeDirty` callback    |
| 2   | Input validation          | Zod: `phaseSchema` from `src/shared/lib/registry/to-zod.ts` + `DATA_COLUMNS` column whitelist |
| 3   | Concurrency               | Already implemented in `phase-repo.updateWithVersion` (CAS by `updated_at`) — use as is       |
| 4   | Mutation authorization    | `requireUser()` + `canWrite(user)` in every action (readonly — denial)                        |
| 5   | Audit                     | Inside `updateWithVersion` (a single `db.batch`), `actorId` = `SessionUser.id`                |

## 2. Action contracts (`src/features/matrix/actions.ts`)

```typescript
'use server'

type ActionResult =
  | { ok: true; applied: true; row: PhaseRow }
  | { ok: true; applied: false; row: PhaseRow } // 409 conflict: row = current server row
  | { ok: false; error: string }

/** Batch save of dirty cells of one phase (output of subscribeDirty). */
export async function savePhaseCells(
  patientId: number,
  phaseId: number,
  cells: Array<{ fieldId: string; value: FieldValue }>,
  baseVersion: string
): Promise<ActionResult>

/** Creating a new phase ("+ Phase" column in the grid). */
export async function createPhase(
  patientId: number
): Promise<{ ok: true; phaseId: number; row: PhaseRow } | { ok: false; error: string }>

/** Deleting a phase (action: 'phase_deleted' in audit). */
export async function deletePhase(patientId: number, phaseId: number): Promise<ActionResult>
```

Requirements for `savePhaseCells`:

1. **Authorization:** `const user = await requireUser(); if (!canWrite(user)) return { ok: false, error: 'readonly' }`.
2. **Validation:** the assembled patch is run through `phaseSchema.partial()`; patch keys
   are filtered by `DATA_COLUMNS` from `phase-repo.ts` (system `id`, `patient_id`, `phase_order_id`
   are never passed by the client). An invalid cell value → `ok: false` with a list of fields.
3. **CAS:** the patch goes to `phaseRepo.updateWithVersion(phaseId, patch, baseVersion, user.id)`.
   - `applied: true` → return the fresh row; the client updates `baseVersion = row.updated_at`.
   - `applied: false` → the client runs the conflict scenario (§4).
4. **Phase create/delete** — also via `db.batch` with audit (`phase_created` / `phase_deleted`,
   `field_id: 'phase'`); deletion — only if the phase is empty or confirmed by a modal (see §5).

## 3. Client integration

- `app/matrix/page.tsx` (server): `requireUser()`, load patient and phases
  (`patientRepo`, `phaseRepo.listByPatient`), map `PhaseRow[]` → `MatrixData`
  (keys — `phase_order_id`-columns: anamnestic phases, 98, 99) and pass
  `baseVersion` (by `updated_at` of each row) to the client component.
- `matrix-demo.tsx` → `matrix-client.tsx`: `onPersist` calls `savePhaseCells`
  with the accumulated batch; load/error state — a corner toast, input blocking
  is not required (the dirty queue continues).
- `canWrite` denial (role readonly): the grid renders with `isReadOnly` immediately from the prop of the
  server page; the action duplicates the check (we do not trust the client).

## 4. Conflict scenario (implementation of §6.4–6.5 ./matrix.md)

1. `applied: false` → for each batch cell compare `mine` (in the store) with `theirs` (`row[fieldId]`):
   - `mine !== theirs` → `markConflict(phaseId, fieldId, { mine, theirs, serverUpdatedAt: row.updated_at })`;
   - equal → silently update the version token;
   - cells outside the batch → we do not touch them (server auto-merge).
2. `resolveConflict('mine')` → repeated `savePhaseCells` with a patch of only this cell and
   `baseVersion = serverUpdatedAt`; `resolveConflict('theirs')` → only clearing the flag.
3. After full resolution — `clearConflicts(phaseId)` and update the version token.

## 5. UX of phase create/delete

- "+ Phase" button in the grid header → `createPhase` → reload the phase list (revalidate / `router.refresh`).
- Phase deletion: a confirm modal with the list of filled fields, if any; phases 98/99 cannot be deleted.

## 6. Acceptance criteria

1. `/matrix` (or `/patients/[id]`) without mock: data from D1, cell input → after the 300 ms debounce a write to the DB, a `audit_log` row with a non-empty `actor_id`.
2. Two browser windows: changing one cell in the second window → in the first — conflict highlighting, both resolutions work, no data lost.
3. Role `readonly`: cells are not editable, a direct action call returns `readonly`.
4. `npm run lint`, `npx tsc --noEmit` — no errors.
