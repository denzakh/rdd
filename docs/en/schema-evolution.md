# Spec: Protocol versioning and schema evolution (./schema-evolution.md)

**Status:** spec · **Dependencies:** registry core (done), gen:d1 diff-generator (done)
**FSD layer:** `src/shared/config/registry`, `src/shared/lib/registry/*`, migration `000N_registry_versions.sql`

---

## 1. Context and constraints

The registry is the single source of truth (rdd-v1.md §3), and `gen:d1` knows safe
`ADD COLUMN`/`RENAME COLUMN` (rdd-v1.md §5). But a patient cohort in a real study
is not one-off: the protocol (CRF) changes during accrual — by an ethics committee
amendment a scale is added, an existing field changes its `options` set, a field is taken
out of use. The problem is not technical (schema migration is already solved), but **semantic**:
what does a field value entered before the amendment mean in a later statistical analysis
together with values entered after?

Key constraint: **`gen:d1` does not and must not know about versioning** — that is
deliberately left outside the diff engine (see §8.1 below), otherwise the generator's
schema bloats into itself.

## 2. Options considered (decisions)

| Option                                                                                                   | Decision                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. `registry_version` on the record (patient/phase "frozen" under the version as of the collection date) | **ACCEPTED** — minimal schema, compatible with append-only audit, no rewrite of historical data                                                      |
| B. Full record in a separate schema-history table (event sourcing at the field level)                    | rejected: overkill for a scale of ~50 fields/single center; complicates every SELECT with a history JOIN                                             |
| C. On-the-fly value migration at each amendment (re-encoding old data)                                   | rejected as a default rule — loses the traceability of "what the physician actually answered at the exam"; allowed only as an explicit decision (§5) |
| D. Ban any semantic changes, only forward-compatible field additions                                     | rejected as the sole strategy: real protocols require amendments to existing fields, a ban does not scale over the whole lifecycle                   |
| E. Versioning the entire registry (`REGISTRY_V1`, `REGISTRY_V2`, ...)                                    | deferred — overkill while amendments touch single fields rather than the whole structure; a candidate for systematic protocol amendments             |

## 3. Classification of registry changes

Not every registry change requires versioning — the classification decides which
changes are safe by themselves (already covered by the diff-generator) and which require
an explicit escalation protocol under this spec:

| Change type                                            | Compatibility            | Mechanism                                                                                          |
| ------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------- |
| New field added                                        | forward-compatible       | `gen:d1 ADD COLUMN`, old records get `NULL` — nothing required                                     |
| Field renamed (same meaning, different `id`/`label`)   | forward-compatible       |                                                                                                    |
| New option added to a `select` field (`options`)       | forward-compatible       | nothing required, old codes stay valid                                                             |
| An existing option of a `select` field removed/renamed | **breaking**             | requires `registry_version` (§4) — otherwise old codes are unreadable                              |
| `min`/`max` range narrowed                             | **breaking**             | requires `registry_version` — historical values could go beyond the new range                      |
| Field taken out of use (protocol amendment)            | **breaking**             | the field is marked `deprecated_since: <version>`, not removed from the registry (see §6.1)        |
| `db_type` of an existing field changed                 | **exotic, out of scope** | `gen:d1` already aborts (rdd-v1.md §5) — manual intervention is mandatory regardless of versioning |

### 3.1. Who sets `deprecated_since` and how

`deprecated_since` is not computed, but a **human decision**, manually set in
the field definition at the moment of the protocol amendment, the same way as `label`/`options`:

```typescript
{
  id: 'ad_efficacy',
  options: { 1: 'Full effect', 2: 'Partial', 3: 'No effect' },
  deprecated_since: 3,          // set manually on a breaking edit
  replacedBy: 'ad_efficacy_v2', // optional — a hint in UI/dictionary
}
```

The system cannot itself "understand" that the meaning of a scale has changed clinically —
that is a matter of protocol semantics, not code structure (the same principle as
`gen:d1`'s abort on exotic changes, rdd-v1.md §5). The risk is not technical impossibility, but
human error: an `options` edit can be made while forgetting to set the flag. This is closed
not by "smart" automation, but by a guard test on the registry diff (analogous to
the existing sync check of `d1-schema.ts`/`.schema-snapshot.json`,
stage-4 §2): if a field lost an option, narrowed its range, **or a boundary appeared
where there was none before** (`min`/`max` was `undefined`, became a concrete number —
this is also a narrowing, only from the open side), while `deprecated_since` did not increase —
the test fails in CI pointing out that you must either create a new field (§5, path 1) or
explicitly declare a version.

**Snapshot-based mechanics.** The guard compares the field with the state fixed in
`.registry-evolution-snapshot.json` and requires `deprecated_since` to **grow
relative to the snapshot**, rather than the "freshness" of the snapshot file itself. The snapshot
does not have to be regenerated on every legal (forward-compatible) edit — only on
breaking edits, when `deprecated_since` actually changes. This is deliberately
weaker than the requirement "the snapshot is always current": it reduces friction in CI (no need
to regenerate the baseline on every harmless `ADD COLUMN`), but does not lose protection —
it is `deprecated_since` relative to the snapshot, not the mere fact that the file is stale,
that signals "this breaking edit was explicitly declared".

## 4. Data schema (migration `000N_registry_versions.sql`, manual — like `0002_audit.sql`/`0003_auth.sql`)

```sql
CREATE TABLE registry_versions (
  version     INTEGER PRIMARY KEY,        -- monotonically increasing protocol number
  effective_at TEXT NOT NULL,             -- ISO, from which moment it applies
  note        TEXT NOT NULL,              -- brief edit description (protocol amendment N)
  approved_by TEXT                        -- link to the ethics committee decision (text, outside system scope)
);

ALTER TABLE patients ADD COLUMN registry_version INTEGER NOT NULL DEFAULT 1
  REFERENCES registry_versions(version);
ALTER TABLE phases   ADD COLUMN registry_version INTEGER NOT NULL DEFAULT 1
  REFERENCES registry_versions(version);
```

- `registry_version` is set **once at record creation** (patient/phase) and does not
  change retroactively — just as `updated_at` does not rewrite history but records
  the moment. This is a direct continuation of the CAS/audit principle
  (matrix.md §6.2, §6.6): data carries the context mark in which it was collected,
  rather than being adjusted to the current schema state.
- Added to `MANUAL_MIGRATIONS` (`scripts/db-restart.ts`), applied after the baseline —
  the same order as `0002`/`0003` (auth.md §10).

## 5. Breaking change of `options` (re-encoding)

If an edit is breaking (§3), two paths are allowed — the choice is fixed in the registry
edit itself, not by a global rule:

1. **A new field** (`ad_efficacy_v2` next to the old `ad_efficacy`, the old one marked
   `deprecated_since`) — data is not rewritten, both columns are readable separately
   taking the record's `registry_version` into account. The preferred path for clinical scales.
2. **Explicit value migration** with a re-encoding map
   (`{ old_code: new_code }` in the registry edit itself, applied by the script
   `scripts/migrate-registry-values.ts` only to records with `registry_version < N`) —
   allowed for purely technical edits (a typo in encoding), **forbidden** for
   changes to a scale's clinical meaning (only path 1 is suitable there).

## 6. Data Dictionary and export under versioning

- `data-dictionary.md`: the `/data-dictionary` page shows the current registry version;
  `deprecated_since`-fields are shown with the marker **"deprecated since version N"** and a link
  to `replacedBy`, if set. The field's **range** of activity (e.g. "active in
  versions 1–2") is not shown: fields have no own `introducedIn`, all registry fields
  exist from version 1 by default, so the lower bound of the range is uninformative.
  If a field added not from version 1 (with its own "birth date") appears in the future,
  then `introducedIn` is worth adding and showing the full range — not needed now.
  The dictionary remains a synchronous source of truth for deprecated fields too.
- `export.md`: `getDeidentifiedDataset()` includes the record's `registry_version` in the dump
  (`meta.registryVersions`) — a mandatory field for a biostatistician, otherwise mixing codes
  of different versions of one scale in a single column yields a statistical artifact that no one
  notices without an explicit mark.

### 6.1. Field lifecycle in the interface (matrix)

Visibility/editing depends not on a global "show/hide" flag, but on
comparing `record.registry_version` (patient/phase) with `field.deprecated_since` — the same
context mark from §4, now applied to rendering too, not just to export:

| Case                                                              | Behavior in the grid                                                                                                                    |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| New record, `registry_version ≥ deprecated_since`                 | The column is not rendered at all — the same condition already used for scope/`is_current_only` (matrix.md), only by version            |
| Old record, `registry_version < deprecated_since`, a value exists | Visible, **read-only** (muted style + tooltip "deprecated since version N, see `replacedBy`"); no new values are entered into the scale |
| Old record, no value                                              | Empty cell, same read-only, no data                                                                                                     |
| Fixing an error in historical data                                | Not through a grid cell — a separate narrow-role path with mandatory audit (reuses §5, path 2, at the scale of one record)              |

`isEditable = canWrite(user) && !isDeprecatedForRecord(field, record.registry_version)` —
a second independent axis on top of the existing role check (auth.md §8), not a replacement for it.

## 8. Boundaries and escalation thresholds

### 8.1. What is deliberately not done now

- Automatic UI generation for comparing field versions ("what changed in protocol v3
  relative to v2") — not implemented while there are few amendments; `registry_versions.note`
  suffices as a textual log.
- `gen:d1` does not participate in value versioning — it knows only about _schema_ evolution
  (columns), not about the evolution of _meaning_ of values inside a column. Mixing these two
  mechanisms is a source of future errors, the boundary is intentional.

### 8.2. Escalation threshold to option E (versioning the whole registry)

Reconsider the decision (move to `REGISTRY_V1`/`REGISTRY_V2` as separate objects),
if at least one of the following occurs:

- the number of breaking edits exceeds ~5–7 (individually tracked fields become harder
  to keep in one's head than whole registry versions);
- a need arises to support data entry **simultaneously under two active
  protocol versions** (a multi-center study where centers switch to an amendment
  non-synchronously) — currently `registry_version` is a mark for reading retroactively, not
  an active-UI switch for entry.

## 9. Acceptance criteria

1. Adding a new `select` field with `options` does not require a write to `registry_versions` —
   forward-compatible by definition (§3).
2. A breaking edit of an existing `select` field without creating a new version/new field —
   blocked at review by a checklist (§3), not just by agreement.
3. The guard test (§3.1) fails if a field lost an option/narrowed its range while
   `deprecated_since` is not set or not increased.
4. Export (`export.md`) contains `registry_version` for each row; mixing codes
   of different versions of one scale without a mark is unacceptable and is verified by a test
   on a dump of synthetic data with two versions.
5. `/data-dictionary` shows `deprecated_since` for deprecated fields,
   does not silently remove them from the view.
6. In the matrix grid: the column for a newly `deprecated` field is not rendered on records with
   `registry_version ≥ deprecated_since`; on old records the field is visible and read-only (§6.1).
