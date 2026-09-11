# De-identified dataset export (./export.md)

**Researcher's task:** not to work in the UI, but to get a dump for statistics
(R/Python) with no direct patient identifiers.

## 1. Two layers: aggregation → serialization

We do not build three exporters from scratch. Layers are separated:

- **Aggregation layer** — `getDeidentifiedDataset()` in
  `src/entities/phase/api/queries.ts`. Returns neutral TS objects
  `{ rows, columns, meta }`. This is the only place with business logic
  and k-anonymity (see §3). The already existing aggregates
  `countByField`, `phaseDurationsByOrder`, `efficacyByMainComponent` also live here —
  they share with the export the same invariant (scope + small-cell suppression).
- **Serialization layer** — thin adapters in `src/shared/lib/export/`
  on top of the same aggregates: `toCsv`, `toJson` (`serializers.ts`),
  `toXlsx` (`xlsx.ts`, zero dependencies — stored ZIP + inline strings).
  Each adapter is ~20–30 lines: all the complexity is already computed.

This is the same decision as "field = column" in the registry core: **one source
of truth — several views.** The principle is systemic, not one-off:
where there is a fork of "how to hand data outward", first one
neutral dataset, then thin views.

## 2. Server Action

`exportDeidentified(format: 'csv' | 'json' | 'xlsx')` —
`src/features/reports/api/actions.ts`. Only auth (`requireUser()`),
scope (`patientScopeFor(user)` — the same row-level access as for lists),
throttling (see below), adapter selection and audit (`export:deidentified`). Returns
`{ mime, filename, base64, ...meta }` — an Action cannot return a Response,
so the client (`ExportPanel`) downloads base64 via Blob.
UI: a panel on `/reports` (`src/features/reports/ui/export-panel.tsx`).

### Throttling (migration `0007_export_throttle.sql`)

Export is the most expensive Server Action (full `patients`+`phases` query,
de-identification + k-anonymity in memory): flooding it hits D1 harder than usual
CRUD. Minimal protection: **1 export / 60 s per user**
(`users.last_export_at`, `EXPORT_THROTTLE_SECONDS` in
`src/shared/api/export-throttle.ts`, `tryClaimExportSlot`). On exceed — an
error with `retryAfterSeconds`, the client shows it as text.

The slot is claimed **atomically** (conditional `UPDATE … WHERE last_export_at IS NULL
OR last_export_at <= ?`): parallel requests do not both pass. A rejected
request does **not** extend the window (the marker is written only on success).
`failed_attempts`/`locked_until` from the login rate-limit are deliberately **not**
reused: an export flood must not block login, and a password brute force must not block
export. The rest of the Server Action flood remains an accepted demo risk
(threat-model.md §2 D, escalation threshold — Cloudflare WAF).

## 3. De-identification (at the aggregation step, not serialization)

**Invariant: PII is filtered once, before data reaches any
format, not separately in each exporter.** Otherwise a new format would forget
to duplicate the masking — a classic hole.

- `id` → `seq_id` (study sequence-number, 1..N by order id);
- registry fields with `pii: true` (`study_entry_date`, `birth_year`,
  `phase_start_date` — see `src/shared/config/registry/types.ts`)
  are automatically excluded from the SELECT; instead only `age_group`
  (1..5, from `getAgeGroup`) and `phase_start_diff_months` (`diffMonths`
  from the inclusion date, not absolute dates);
- column lists are built from the registry (`PATIENT_EXPORT_COLUMNS`,
  `EXPORT_PHASE_COLUMNS`), not hardcoded: a new field without `pii`
  will reach the export on its own, a field with `pii: true` — never;
- **k-anonymity:** the group key is `(age_group, gender, phase_order_id)`;
  rows of groups smaller than `K_ANONYMITY_K` (5) are suppressed,
  the counter — `meta.suppressedRows`;
- **`/reports` aggregates** (`countByField`, `phaseDurationsByOrder`, `efficacyByMainComponent`)
  follow the same invariant: they respect the user's `data_scope` and suppress cells
  with a patient count < `K_ANONYMITY_K` — otherwise small groups (count=1..2) get re-identified
  via a differencing attack;
- consent: `consent_withdrawn_at IS NOT NULL` — excluded from the query
  (data is not deleted); the user's scope is respected.
- **protocol versioning** (./schema-evolution.md §6): each row carries
  `registry_version` (the CRF mark at the time of phase collection), `columns` include
  `registry_version` right after `seq_id`, and `meta.registryVersions` — the list of
  versions present in the dump. Without the mark, mixing codes of different versions
  of the same scale gives an imperceptible statistical artifact.

## 4. Adding a new format

Write an adapter `toNew(data: DeidentifiedDataset)` in
`src/shared/lib/export/` on top of `data.rows`/`data.columns` and a branch
in `exportDeidentified`. Duplicating masking is **forbidden** —
it is already done in `getDeidentifiedDataset`.
