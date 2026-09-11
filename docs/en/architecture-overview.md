# Architecture Overview — RDD docs entry point (part 1/2)

**Purpose:** a 3–5 minute digest of architecture decisions for fast onboarding.
Not a retelling of specs: each section is the most illustrative
"problem → options considered → decision" fork with a link to the primary source.

> **How to read the docs.** This file is the entry point. The working layer is the
> detailed specifications in this directory (`docs/en/`): `rdd-v1.md` (core, registry,
> data schema), `auth.md`, `matrix.md`, `roadmap.md` plus stage specs `spec-stage-1..4.md`.
> Quantitative characteristics (Availability, RTO/RPO, performance budgets) are in
> `nfr.md` (EN). The formalized STRIDE threat model is in `threat-model.md` (EN).
> Specs are intentionally kept as a decision-trail — a record of the thinking, not just
> the final state.

> **Domain note:** the field registry this project is built on originates from the
> author's PhD (candidate of sciences) research on depressive disorders — domain
> expertise + engineering, a combination medtech teams value above clean code alone.

## C4 overview: System Context and Container (one picture)

![C4 overview: System Context + Container](../diagrams/c4-overview.svg)

- **L1 System Context:** physician (`clinician`), admin, `readonly` → RDD; dashed —
  Cloudflare Access (escalation option, `auth.md` §2) and a future EHR (not implemented).
- **L2 Container:** browser → Next.js on Cloudflare Workers (Server Actions, `requireUser()`,
  PBKDF2, scope-repositories) → D1; TS field registry generating schema/Zod/UI;
  Admin CLI for `user:create` (no public registration).
- Dashed arrows = option/future; solid = implemented in v1.

## 1. Registry-driven core — one schema for everything

**Problem:** a medical registry with 50+ fields: how to avoid drift between DB schema,
validation, UI and computations.

**Options:** separate descriptions per layer (typical) vs. a single declared source of truth.

**Decision:** a single TS registry (`src/shared/config/registry/`) generates everything:
D1 schema (via `gen:d1` diff-generator), Zod schemas (`to-zod.ts`), UI rendering, matrix
and computed fields. "Field = column" is the invariant. Schema evolution is reset-only
(`npm run db:restart`): protocol versioning (`registry_versions` + per-record
`registry_version`) lives in generated baseline `0001_init.sql`
(see `schema-evolution.md`).

→ Details: `rdd-v1.md` §3

## 2. Storing binary clinical flags

**Problem:** dozens of binary diagnostic flags — flat columns, EAV, bitmask or JSON?

**5 options considered** (flat / EAV / bitmask / JSON / hybrid). JSON rejected deliberately
despite JSON1 in D1: it removes fields from the "registry → schema → Zod → UI" chain
and complicates per-flag aggregates.

**Decision:** flat `INTEGER 0/1` columns — aggregates with one `WHERE col = 1`, full
typing, auto-migration from the registry. At ~50 flags alternatives give no win.

**Escalation threshold:** >100–150 flags, attributes on a flag, dynamic fields → hybrid.

→ Details: `ru/rdd-v1.md` §7

## 3. CAS and conflict resolution — a clinical invariant

**Problem:** two physicians editing one phase in parallel. Naive optimistic locking
rejects the second patch — silently losing work.

**Decision:** CAS on SQLite-side `updated_at` (never client clocks); three-level
resolution: cell / phase / auto-merge of non-overlapping cells; explicit "mine / theirs"
confrontation in UI with mandatory audit of every resolution.

**Invariant:** a physician's data is never silently lost — before any auto-replacement
the value is available in diff and audit. A clinical data-safety requirement,
not "just optimistic locking".

→ Details: `ru/matrix.md` §6, `ru/spec-stage-1.md` §4

## 4. Authentication under Edge constraints

**Problem:** Cloudflare Workers have no `node:crypto` — bcrypt/argon2 unavailable natively.

**Options:** Auth.js/Lucia (extra dependency, no OAuth scenario), Cloudflare Access
(CF-account tie-in), public registration (forbidden — PII).

**Decision:** own D1-backed sessions + **PBKDF2-SHA256 via Web Crypto** (200k iterations,
params embedded in hash string). Token lives only in HttpOnly cookie; DB holds
SHA-256(token). Two-level route protection: middleware on cookie presence (fast) +
`requireUser()` with DB validation (strict).

→ Details: `ru/auth.md` §2, §4, §5, §7

## 5. Audit as a requirement, not an option

For a clinical registry audit is a domain requirement. `audit_log` is append-only,
outside the registry; data write + audit event are one `db.batch` (atomic); no PII
duplication (ids only); every conflict resolution recorded with before/after values.
Integrity at DB level: triggers forbid UPDATE/DELETE, hash-chain
(`prev_hash`/`entry_hash`, migration `0006_audit_hash_chain.sql`) detects tampering
(`verifyChain()`).

→ Details: `ru/matrix.md` §6.6, `ru/auth.md` §11

## 6. Row-level access: authentication is not data-level authorization

**Problem:** `clinician` sees all patients by default. In a real multi-site study a
physician sees only own-site / assigned patients — including direct card links (else IDOR).

**Decision:** declarative per-user `data_scope` (`all` / `site` / `assigned`) +
`site_id`/`assigned_clinician_id` on patient. Repository created already scoped:
`createPatientRepository(db, patientScopeFor(user))` — every query incl. `findById`
respects scope. Fail closed: `site` with no binding sees nothing.

→ Details: `ru/auth.md` — Row-level access

## 7. Matrix: sticky + virtualization without scroll sync

## Security summary (threat → measure → where)

| Threat                           | Measure                                                     | Source                          |
| -------------------------------- | ----------------------------------------------------------- | ------------------------------- |
| Password brute force             | Rate-limit: 5 wrong → 15 min lock                           | `ru/spec-stage-3.md`, README    |
| Login enumeration                | Constant ~400 ms for existing/non-existing emails           | `ru/auth.md` §6                 |
| DB leak → session hijack         | DB holds only SHA-256(token); raw token in HttpOnly cookie  | `ru/auth.md` §5                 |
| Weak password hash               | PBKDF2-SHA256 200k, constant-time compare                   | `ru/auth.md` §4                 |
| Cookie interception              | `Secure; HttpOnly; SameSite=Lax`, 12 h TTL, sliding         | `ru/auth.md` §5                 |
| Mutation bypassing UI (readonly) | UI `isReadOnly` + `canWrite()` in every Server Action       | `spec-stage-1.md` §1, §3        |
| IDOR on patients                 | `data_scope` + scope-repository on list/count/findById      | `auth.md` — Row-level access    |
| Client field injection           | Whitelist `DATA_COLUMNS`, Zod `phaseSchema.partial()`       | `spec-stage-1.md` §2            |
| Lost authorship                  | `actor_id` from `requireUser()`, audit in one `db.batch`    | `auth.md` §11, `matrix.md` §6.6 |
| PII via logs                     | `audit_log`: ids + JSON values only                         | `matrix.md` §6.6                |
| Public registration              | Forbidden; admin-only accounts; one-time invites, 7-day TTL | `auth.md` §1–2, §9              |

## Demo boundaries: deliberately not implemented

Not a production system for real patients. Deliberately out of scope:

- **Regulation & compliance.** HIPAA / 152-FZ / GDPR-like, consents, DPAs — not
  implemented. Demo data is synthetic; no real PII in the system.
- **Encryption at rest & environments.** D1 platform encryption only; no BYOK/KMS contour.
- **Backup / DR.** Manual migrations only; no PITR/recovery plan.
- **Retention & erasure.** No storage policies / right-to-be-forgotten; append-only
  `audit_log` cascade needs a separate decision (crypto-erasure or anonymization).
- **Medical validation.** Computed fields (pure remission, age) are simplified demo rules;
  no clinician-expert validation of scales was performed.
- **Collaboration scaling.** Polling 30–60 s instead of WebSocket/SSE (v1 trade-off).
- **Field requiredness.** Zod generates `optional().nullable()` (partial patches);
  required-logic compensated in UI — production must close it at schema level.
- **Localization scope.** See `i18n.md`: UI chrome + registry labels are RU/EN;
  historical DB values (codes), clinically validated scale translations, RTL and
  plural rules are explicitly out of scope.

**Problem:** fixed left column + fixed header + virtualization of hundreds of rows.

**Decision:** every virtualized row is a CSS Grid, left cell `position: sticky` inside
the row — no two-layer scroll sync. State: zustand with granular per-cell subscriptions;
input→persist debounce 300 ms with CAS version token.

→ Details: `ru/matrix.md`
