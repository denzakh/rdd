# Threat Model (STRIDE)

**Purpose:** formalize the implicit threat model already captured in
`architecture-overview.md` — Security summary. The same measures repacked by
STRIDE category; "Source" points to where the measure lives in code.

> **Method.** Six STRIDE categories applied to each link of the context diagram
> (`../diagrams/c4-overview.svg`): user → RDD (Next.js on Workers) → D1.
> Some risks consciously accepted for demo (see "Not covered"); everything accepted
> is documented, not "forgotten".

## 1. Trust boundaries

| Boundary          | What crosses          | Assumption                                                 |
| ----------------- | --------------------- | ---------------------------------------------------------- |
| Browser → Workers | HTTPS, session cookie | Client untrusted: time, values, ids untrusted              |
| Workers → D1      | Platform binding      | D1 unreachable from outside; injection via app params only |
| Admin CLI → DB    | Local operator access | Outside network boundary; admin-only accounts              |

No public registration — model assumes "insider attacker" (existing user) and
"outsider without account" (brute force, interception).

## 2. STRIDE analysis

### S — Spoofing

| Threat                               | Measure                                                       | Source               |
| ------------------------------------ | ------------------------------------------------------------- | -------------------- |
| Password brute force                 | Rate-limit: 5 wrong → 15 min lock                             | spec-stage-3, README |
| Login enumeration                    | Same 400 ms delay for existing/non-existing emails            | auth.md §6           |
| Session interception                 | `Secure; HttpOnly; SameSite=Lax`, 12 h TTL, sliding           | auth.md §5           |
| Weak hash (DB theft → offline crack) | PBKDF2-SHA256, 600k iterations, constant-time compare         | auth.md §4           |
| Impersonation via invite             | Registration forbidden; admin-only; one-time links, 7-day TTL | auth.md §1–2, §9     |

### T — Tampering

| Threat                            | Measure                                               | Source              |
| --------------------------------- | ----------------------------------------------------- | ------------------- |
| Mutation bypassing UI (readonly)  | UI `isReadOnly` + `canWrite()` in every Server Action | spec-stage-1 §1, §3 |
| Client field injection            | Whitelist `DATA_COLUMNS`, Zod `phaseSchema.partial()` | spec-stage-1 §2     |
| Parallel write over other's edits | CAS on SQLite `updated_at` + 3-level resolution       | matrix.md §6.4      |

### R — Repudiation

| Threat                                | Measure                                                                       | Source                         |
| ------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------ |
| "It wasn't me"                        | `actor_id` from `requireUser()`; audit append-only, atomic in one `db.batch`  | auth.md §11, matrix.md §6.6    |
| Audit substitution                    | UPDATE/DELETE forbidden by logic AND DB triggers; overwritten versions pinned | matrix.md §6.6                 |
| Journal rewrite with direct D1 access | Hash-chain `prev_hash`/`entry_hash`; `verifyChain()`; UNIQUE on `prev_hash`   | matrix.md §6.6, migration 0006 |

### I — Information Disclosure

| Threat                                        | Measure                                                                                                               | Source                     |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| IDOR: clinician sees other patients           | `data_scope`; scope-repository on list/count/findById                                                                 | auth.md — Row-level access |
| Deanonymization via aggregates (differencing) | Scope filter in ALL aggregates + suppression < K=5                                                                    | export.md §3; `queries.ts` |
| PII via logs                                  | `audit_log`: ids + JSON values only                                                                                   | matrix.md §6.6             |
| DB leak → session theft                       | DB: SHA-256(token) only; raw token in HttpOnly cookie                                                                 | auth.md §5                 |
| Reading others' cells in the matrix           | Collaboration is polling by authorized users; the conflict diff is visible only to the patient's participants (scope) | matrix.md §6.4–6.5         |

### D — Denial of Service

| Threat              | Measure                                                                            | Source             |
| ------------------- | ---------------------------------------------------------------------------------- | ------------------ |
| Login flood         | Rate-limit 5 → 15 min + constant 400 ms                                            | spec-stage-3       |
| Server Action flood | Partially: export 1/min per user (migration 0007); rest accepted, escalation — WAF | auth.md §12        |
| D1 overload         | Paging, virtualization, batching (300 ms debounce)                                 | matrix.md §2, §6.1 |

### E — Elevation of Privilege

| Threat                          | Measure                                               | Source                     |
| ------------------------------- | ----------------------------------------------------- | -------------------------- |
| Self-granting a role            | Registration forbidden; admin-only; CLI `user:create` | auth.md §1                 |
| Client overrides user fields    | System fields never accepted from client (whitelist)  | spec-stage-1 §2            |
| Scope bypass via direct actions | Scope checked on server in repository, not UI         | auth.md — Row-level access |

## 3. Not covered (conscious demo risks)

Full list — "Demo boundaries" in `architecture-overview.md`:

- **Rate-limit / WAF on public actions** — escalation to Cloudflare WAF (auth.md §12).
- **Encryption at rest, KMS, env isolation** — out of scope; D1 platform encryption.
- **Retention / right to be forgotten** — append-only `audit_log` needs crypto-erasure
  or anonymization decision.
- **audit_log integrity under DB compromise.** Hash-chain detects, not prevents:
  full-D1 attacker can recompute the chain (no keys/signatures). Prod: D1 segregation,
  hash offload to WORM/S3, or chain signing.
- **Uptime/alerting** — missing (see `nfr.md`); incidents not auto-detected.
- **Server-side requiredness** — compensated in UI; close at Zod level for prod.

> `/reports` aggregates were scope-unfiltered and unsuppressed (k-anonymity) — fixed:
> they now respect `data_scope` and suppress cells < K.

**Conclusion:** two axes — _client untrusted_ (`canWrite()`, whitelist,
scope-repository, CAS duplicated on server) and _every action traceable_
(`actor_id` + append-only audit atomic with mutation).
