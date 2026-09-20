# Spec for the AI agent: Developing the "Matrix" widget (MatrixGrid)

**Goal:** build a high-performance, virtualized table component for displaying and entering a large number of clinical features across dynamic time points (phases) of the disease.

**Stack:** Next.js 16 (App Router), React 19, TypeScript (Strict), Tailwind CSS, `@tanstack/react-virtual`, `zustand` (both packages installed in `package.json`), `zod`.

> **State management:** `react-hook-form` for the grid is NOT used. Cell state is a `zustand` store with granular subscriptions (see §2.2).

**Architectural layer (FSD):** `src/widgets/matrix/`

---

## 0. Fixed architectural decisions

| #   | Problem                        | Solution                                                                                       |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| 1   | Sticky column + virtualization | **A:** row = CSS Grid, left cell `position: sticky; left: 0` inside the virtualized row (§1.3) |
| 2   | State management               | **C:** zustand store, atomic per-cell subscriptions via selector hooks (§2.2)                  |
| 3   | Cell memoization               | **A:** stable `onChange` + comparator extension + primitive props (§2.3)                       |
| 4   | Keyboard navigation            | **A:** declarative focus — ref registry + `scrollToIndex` + roving tabindex (§4.2)             |
| 5   | Responsiveness                 | **C:** v1 — desktop-only, explicitly noted (§4.3)                                              |

---

## 1. Component architecture and interfaces

### 1.1. Input data types

```typescript
import { RegistryField } from '@/shared/config/registry/types'

/** Cell value. Union instead of `any` — derived from the `db_type` of the registry field. */
export type FieldValue = string | number | boolean | null

export interface MatrixColumn {
  id: string // e.g., "phase_1", "status_98", "outcome_99"
  title: string // Column title (e.g., "Phase 1")
  order: number
  isCurrentStatus?: boolean // Flag for column 98 (current status)
}

export interface MatrixGridProps {
  registryFields: RegistryField[] // Flat array of fields (FLAT_REGISTRY)
  columns: MatrixColumn[]
  data: Record<string, Record<string, FieldValue>> // Struct: { [phaseId]: { [fieldId]: value } }
  onChange: (phaseId: string, fieldId: string, value: FieldValue) => void
  isReadOnly?: boolean
}
```

### 1.2. Two-axis scroll structure (CSS Grid + Sticky)

- **Container:** `overflow: auto; max-height: calc(100vh - 120px); position: relative;`
- **Y axis (fixed left column):**
- Width: `320px` (`min-width: 280px`).
- `position: sticky; left: 0; z-index: 10; bg-background`.
- Displays the feature name (`field.label`) and a category indicator.

- **X axis (fixed top row):**
- Height: `48px`.
- `position: sticky; top: 0; z-index: 20; bg-background`.
- Displays the time-point titles.

- **Intersection (Top-Left Cell):** `position: sticky; top: 0; left: 0; z-index: 30; bg-background`.

### 1.3. Combining sticky column and virtualization (decision 1-A)

Each virtualized row is rendered as a CSS Grid:

```tsx
<div
  style={{ transform: `translateY(${virtualRow.start}px)` }}
  className="grid-template-columns: [320px_1fr] grid"
>
  {/* Left cell — sticky by X. Sticky by Y does not conflict
      with the virtualizer's translateY, because it moves the row container,
      not the rows themselves. */}
  <div className="bg-background sticky left-0 z-10">{field.label}</div>
  <div
    className="grid"
    style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(140px, 1fr))` }}
  >
    {/* phase cells */}
  </div>
</div>
```

- The virtualizer works only along the Y axis (`translateY` of the row container).
- Sticky by X is implemented natively inside each row — **zero JS scroll sync**.

---

## 2. Performance and Virtualization

1. **Row virtualization (`@tanstack/react-virtual`):**

- The virtualizer is configured on the parent scroll container.
- Fixed row height: `40px` (must be strictly observed for correct scroll calculation).
- Render only the rows that fall into the visible viewport (`overscan: 5`).

2. **Cell state isolation (Zero Global Re-renders) — zustand (decision 2-C):**

`react-hook-form` is not used. Grid state is a zustand store of the form `{ [phaseId]: { [fieldId]: FieldValue } }`. Each cell subscribes to its own slice via a selector — **only the changed cell re-renders**, the row and table are not touched:

```ts
// src/widgets/matrix/model/matrix-store.ts
import { create } from 'zustand'

interface MatrixState {
  data: Record<string, Record<string, FieldValue>>
  setValue: (phaseId: string, fieldId: string, value: FieldValue) => void
}

export const useMatrixStore = create<MatrixState>((set) => ({
  data: {},
  setValue: (phaseId, fieldId, value) =>
    set((s) => ({
      data: {
        ...s.data,
        [phaseId]: { ...s.data[phaseId], [fieldId]: value },
      },
    })),
}))

// Granular selector hook: subscribe strictly to one cell
export const useCell = (phaseId: string, fieldId: string) =>
  useMatrixStore((s) => s.data[phaseId]?.[fieldId] ?? null)
```

- Input is managed by the local state of the `MatrixCell` component (uncontrolled input).
- Commit to the store — on `onBlur` or after a 300ms debounce.
- `useCell` returns a primitive — zustand redraws the cell only when this primitive changes (`Object.is`).
- Persist/API sync — a separate subscriber `useMatrixStore.subscribe` (a debounce queue of dirty cells), not via React re-renders.

### 2.3. Cell memoization — details (decision 3-A)

The zustand selector already removes ~90% of redundant re-renders, but `React.memo` remains the second line of defense (row re-render on layout change, column change, row-level hover effects).

**Requirements without which memoization does not work:**

1. **Stable `onChange`.** A single callback is created in the grid once:

```tsx
// Inside MatrixGrid — useCallback with empty dependencies
const commit = useCallback((phaseId: string, fieldId: string, value: FieldValue) => {
  useMatrixStore.getState().setValue(phaseId, fieldId, value)
}, [])
```

The cell closes its own `phaseId`/`fieldId` inside itself — the `onChange` prop stays identical between renders.

2. **Only primitive props.** The cell is NOT passed the `field` object. Instead — computed primitives:

```tsx
interface MatrixCellProps {
  phaseId: string
  fieldId: string
  ui: UIComponent // primitive discriminator of the rendering factory
  value: FieldValue // primitive from useCell
  disabled: boolean
  error?: string
  onChange: (v: FieldValue) => void
  ...
}

const MatrixCell = React.memo(
  MatrixCellBase,
  (prev, next) =>
    prev.value === next.value &&
    prev.disabled === next.disabled &&
    prev.error === next.error &&
    prev.ui === next.ui
)
```

(`phaseId`/`fieldId`/`onChange` are constant by construction — they can be omitted from comparison; `options` compare via `prev.options === next.options` — reference equality is guaranteed by the `useMemo` from p.2.)

**Effect:** on input into a cell exactly one cell re-renders. On data loading / phase switching — only the changed cells.

---

## 3. Cell rendering factory (`MatrixCellRenderer`)

The cell component selects a UI controller based on the `field.ui` property:

- **`checkbox` / `toggle-binary`:**
- Returns `0` or `1` (for D1 SQLite compatibility).
- UI: a compact checkbox or binary toggle.

- **`select`:**
- Maps the variants from `field.options`.
- UI: a compact custom or native `select`.

- **`number-input` / `text-input`:**
- A compact `input` without value stepper arrows (no-spinners).

- **`date-picker`:**
- Date picker in `YYYY-MM-DD` format.

- **`badge-readonly`:**
- A read-only component (for computed `calculate` fields).
- Displays the computed value (e.g., age or a scale result) as a styled Badge.

---

## 4. Visual hierarchy and UX

- **Section grouping:** While scrolling, categories (Socium, Mental status, Pharmacotherapy, Scales) are separated by divider rows with `bg-muted` background and `font-semibold`.
- **Section subgroups (Option A):** Within a section, fields may carry a `group` (a reference to a subgroup dictionary key next to the registry block, e.g. `THERAPY_GROUPS` in `src/shared/config/registry/therapy.ts`). When the group changes, `buildMatrixRows` (`matrix-rows.ts`) inserts a subheader row (`kind: 'subgroup'`): background `bg-muted/60`, `text-xs font-medium`, `pl-6` indent — visually quieter than the section header. The "Field = column" invariant is untouched: grouping is display-only (matrix + Data Dictionary), the registry stays flat. A section without a subgroup dictionary (`SECTION_GROUPS` in `matrix-rows.ts`) renders as a flat list. Currently only the "Pharmacotherapy" section has subgroups: Depressogenic background, Somatic support, Antidepressant classes, AD course: dose/route/effect, Antipsychotics & tranquilizers.
- **Grid row hiding (row-level):**
  - `hide_in_matrix` in the registry — the field is not rendered as a grid row (auto-duplicates: the phase number is visible in the column header; `hamd_severity`/`pure_remission`/`ad_any` derive from nearby visible values). The field remains in the registry, `applyComputed`, Data Dictionary and export.
  - Deprecated fields by protocol version: the row is excluded entirely if ALL phases of the grid are under version ≥ `deprecated_since`; if at least one phase is older, the row stays and cells of "withdrawn" phases are hidden individually. Conditions — `src/shared/lib/registry/field-availability.ts`, lifecycle — `./schema-evolution.md` §6.1.
- **Active row/column highlighting:** add a hover effect for the whole row (`hover:bg-accent/50`) and visual highlight of the current-status column (98) with a thin color border (`border-l-2 border-amber-500`).
- **Keyboard navigation (decision 4-A — declarative focus):**
- **Roving tabindex:** among the row's interactive elements exactly one cell has `tabIndex=0`; the rest have `tabIndex=-1` (they are reached by arrows, not by Tab through the whole table).
- Tab / Shift+Tab — native DOM order (moving between columns and out of the table).
- Up/Down arrows — inter-row navigation with autofocus on the same column:

```tsx
// Ref registry of visible cells in the grid
const cellRefs = useRef(new Map<string, HTMLElement>()) // key: `${row}:${col}`

const moveVertical = (row: number, col: number, dir: 1 | -1) => {
  const next = row + dir
  if (next < 0 || next >= rowCount) return
  rowVirtualizer.scrollToIndex(next, { align: 'auto' })
  requestAnimationFrame(() => {
    const el = cellRefs.current.get(`${next}:${col}`)
    el?.focus()
  })
}
```

- Cells outside the viewport cannot receive focus — therefore `scrollToIndex` + `requestAnimationFrame` (after the virtualized row mounts) is mandatory before focusing.
- Section and subgroup header rows (`kind: 'section' | 'subgroup'`) contain no cells — focus "skips" them to the nearest field in the direction of movement (the `nextFieldRow` helper in `matrix-grid.tsx`).
- **Responsiveness (decision 5-C):** v1 — **desktop-only** (min viewport width 1024px). A mobile layout (phase cards, compact sticky column) is a separate task after v1 stabilization.

---

## 5. Acceptance criteria and tests

### 5.1. Performance criteria (mandatory)

- Input into a cell at 230 rows × 10 columns: redraw of **exactly one cell**; neighboring rows and the parent row are not re-rendered (verified in a test via render counters).
- First grid render ≤ 300ms on the reference dataset; scroll without dropped frames (React Profiler / Chrome Performance check).

### 5.2. Tests

- **Unit:** the `MatrixCellRenderer` rendering factory — mapping of all `field.ui` → controller, correct values (0/1 for checkbox, `YYYY-MM-DD` for date).
- **Unit:** the zustand store `setValue` — immutability, cell isolation.
- **Integration:** input into a cell does not cause a row/neighboring-cell re-render (`@testing-library/react` + render counters).
- **Integration:** keyboard navigation — the Down arrow scrolls to an invisible row and places focus in the same column.
- **A11y smoke:** roving tabindex (exactly one `tabIndex=0` per row), aria-label on controls.

---

## 6. Server sync

### 6.1. Save trigger

1. Commit the value to the zustand store — on `onBlur` (text/number/date) or immediately (`checkbox`, `select`).
2. `subscribeDirty` accumulates dirty cells and, after a **300ms** debounce, hands a batch of `DirtyCommit[]` to `onPersist` (outside React re-renders).
3. **Batch grouping by `phaseId` is mandatory:** cells of one phase → one `PATCH /api/phases/:id` with a patch body (one UPDATE = atomic). Patches of different phases are sent independently/in parallel.
4. **Flush before unloading:** `beforeunload` / `visibilitychange → hidden` — immediate sending of the pending batch (`fetch` with `keepalive: true`), otherwise edits within the debounce window are lost.
5. Status indicator in the grid header: "saved / saving / error / conflict".

### 6.2. `updated_at` version token (CAS)

1. We do not trust the client clock. The only time source is the **D1 engine**: `updated_at` is generated by the SQLite function at query execution:
   ```sql
   -- migration:
   updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))

   -- every UPDATE:
   UPDATE phases
   SET ..., updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
   WHERE id = ? AND updated_at = ?   -- Optimistic Concurrency Control
   ```
2. `updated_at` is a **version token**, not a "label for display". The client receives it with the phase data and returns it in every PATCH.
3. `WHERE updated_at = ?` affected no rows → respond **409 Conflict** with the current phase row in the body.
4. CAS is always on, regardless of mode (a safeguard against two tabs/devices of one user). The ISO format with `%f` is lexicographically sortable — suitable also for `WHERE updated_at > ?` in polling.

### 6.3. Operating modes (client setting)

- The mode is a **client-side UI policy** (localStorage + a toggle in the grid header), unknown to the server:
  - **`solo`** (default): polling off; CAS on.
  - **`collab`**: polling `GET /api/patients/:id/phases/changes?since=<max updated_at>` every 30–60s; the response is phases with `updated_at > since` and their values.
- Others' edits are merged **per cell in the zustand store** (`setValue`), while **locally dirty cells (the user is still typing/has not left the field) are not overwritten**.
- Thanks to the zustand selectors, pulling in others' edits re-renders only the changed cells.
- In `collab` mode — an indicator "updated by a colleague N sec ago".

### 6.4. Conflict resolution (409)

Trigger: PATCH returned 409 with the current phase row (the `serverRow` + `serverUpdatedAt` values).

**Physician tools (UI):**

1. **Phase conflict banner** (not a modal, does not block the rest of the matrix): "Phase X was changed by another researcher at HH:MM".
2. **Per-cell diff:** cells where the server value differs from the local one are highlighted (e.g., `ring-amber-500`), tooltip — "Your value → colleague's value".
3. **Choice at three levels:**
   - **Per cell** — clicking a conflicting cell opens a mini-menu: "Keep mine / Accept colleague's value" (the cell is the minimal unit of a clinical edit);
   - **Per phase** — buttons in the banner: "Accept all of theirs" (reload the phase into the store, the local draft is reset) / "Overwrite all with mine" (a repeated PATCH with the current `serverUpdatedAt` — CAS now passes);
   - **Merge by default** — automatic only for non-overlapping cells: cells the physician did not edit locally are silently updated with the server values; a conflict arises only on actually overlapping cells. Free text is not auto-merged without the physician's involvement.
4. **Audit:** all resolved conflicts are logged (who, when, which field, whose value was accepted) — a mandatory requirement for a clinical registry; the overwritten version is kept in the log.
5. After conflict resolution the banner is removed, `since` for polling is updated to `serverUpdatedAt`.

**Invariant:** a physician's data is never silently lost in any scenario — before any auto-replacement the value is available in the diff/audit.

### 6.5. Storing "mine"/"theirs" in the store

- A conflict is a **separate store slice**, not two values in `data`. At the moment of a conflict `data` contains "my" local version:

```ts
export interface CellConflict {
  mine: FieldValue // what the physician tried to write (already in data)
  theirs: FieldValue // what the server returned in 409
  serverUpdatedAt: string // version token for a repeated PATCH
}

interface MatrixState {
  data: MatrixData
  conflicts: Record<string, CellConflict> // key: `${phaseId}:${fieldId}`
  markConflict(phaseId, fieldId, c): void
  resolveConflict(phaseId, fieldId, resolution: 'mine' | 'theirs'): void
  clearConflicts(phaseId): void
}

export const useCellConflict = (phaseId, fieldId) =>
  useMatrixStore((s) => s.conflicts[`${phaseId}:${fieldId}`])
```

- 409 handling: for cells of the failed patch where `theirs !== mine` → `markConflict`; matching → fix the new token; cells outside the patch (the physician did not edit them) → silent auto-merge with server values.
- A cell subscribes via `useCellConflict`; the `conflict` prop is in the `React.memo` comparator. An active conflict: `ring-amber-500` highlight, tooltip "Yours: X → Colleague's: Y", click — a mini-menu "Keep mine / Accept colleague's value" → `resolveConflict`.
- Rationale: `useCell` returns a primitive, memoization and auto-merge do not change; a conflict is a "cell status". Without conflicts the layer is absent (zero overhead).

### 6.6. Audit (D1)

- The `audit_log` table is a system entity, **outside the registry** (migrations `0002_audit.sql` +
  `0006_audit_hash_chain.sql`, not `gen:d1`). Append-only: UPDATE/DELETE are forbidden by the logic
  **and at the DB level** — triggers `audit_no_update`/`audit_no_delete` (RAISE ABORT, migration 0006).
- **Integrity (hash-chain):** each record stores `prev_hash` (the previous
  record's entry_hash) and `entry_hash` = SHA-256 of the canonical payload (prev_hash + all record fields).
  Substituting or deleting a record breaks the chain; verification — `createAuditRepository(db).verifyChain()`.
  A UNIQUE (partial) index on `prev_hash` excludes a chain fork. Limitation: an operator
  with full DB access can recompute the entire chain — an accepted risk,
  see [threat-model.md §2 R, §3](./threat-model.md).
- Schema:

```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actor_id TEXT,                  -- id of the user from the session (nullable before auth appeared)
  patient_id INTEGER NOT NULL,
  phase_id INTEGER,
  field_id TEXT NOT NULL,         -- registry field id or 'phase' (row level)
  action TEXT NOT NULL,           -- 'update' | 'conflict_resolved' | 'phase_created' | 'phase_deleted'
  resolution TEXT,                -- 'mine' | 'theirs' (only conflict_resolved)
  old_value TEXT,                 -- JSON(FieldValue)
  new_value TEXT,                 -- JSON(FieldValue)
  overwritten_version TEXT,       -- updated_at of the overwritten version (conflicts)
  base_version TEXT               -- the CAS token the client wrote from
);
CREATE INDEX idx_audit_phase ON audit_log (phase_id, ts);
CREATE INDEX idx_audit_patient ON audit_log (patient_id, ts);
-- migration 0006_audit_hash_chain.sql:
ALTER TABLE audit_log ADD COLUMN prev_hash TEXT;   -- entry_hash of the previous record
ALTER TABLE audit_log ADD COLUMN entry_hash TEXT;  -- SHA-256(prev_hash + payload)
CREATE UNIQUE INDEX idx_audit_prev_hash ON audit_log (prev_hash) WHERE prev_hash IS NOT NULL;
-- + triggers audit_no_update / audit_no_delete (RAISE ABORT)
```

- Values are JSON strings (`JSON.stringify(FieldValue)`); PII is not duplicated in the log (only ids).
- **Atomicity:** the data write + audit — a single `db.batch([...])`; the CAS result is checked after the batch, on failure — a separate `conflict_received` event / no record-write audit.
- Repository: `src/shared/api/audit-repo.ts` (`insertBatch`, `listByPhase`, `listByPatient`).
- Dependency: ~~without auth `actor_id` is empty~~ — **auth is implemented** (migration `0003_auth.sql`): sessions in D1 (`session-repo.ts`), login via `features/auth`, `actor_id = SessionUser.id` from `requireUser()`/`getCurrentUser()`. ~~Matrix records are demo (mock)~~ — **real mutations are implemented** (stage 1, `./spec-stage-1.md`): Server Actions (`src/features/matrix/api/actions.ts`) call `phase-repo.updateWithVersion` with `actorId = user.id`, audit is written in the same `db.batch`.

### 6.7. Escalation threshold: polling → push updates

The current `collab` mode is polling every 30–60 s: a deliberate v1 trade-off (no WebSocket/SSE infrastructure, zero extra dependencies, works on Workers without Durable Objects). The downside — an undiscovered-conflict window of up to the polling interval.

**Reconsider the decision (switch to push) when at least one of the following occurs:**

- systematic (not occasional) **parallel work of ≥2 physicians on one patient** within one shift — the 30–60 s window starts to feel like "they overwrote it, and I did not see it";
- **user complaints of lost/stale data** or growth of the share of resolved `conflict_resolved` conflicts in the audit above the baseline;
- adoption of **Durable Objects** for another reason (presence, chat, live statuses) — then SSE/WS over DO is cheaper than a separate solution.

**Candidate solution on escalation:** a Durable Object per patient (coordination) + SSE for distributing `updated_at` tokens; the CAS model and conflict UI (§6.4–6.5) stay unchanged — only the detection speed changes, not the resolution mechanism.

Until the threshold is reached polling is correct: CAS guarantees that data loss is impossible in principle, polling affects only the detection speed, not integrity.
