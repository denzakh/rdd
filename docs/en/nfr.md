# Non-functional requirements (NFR / SLO)

**Purpose:** collect the system's quantitative characteristics in one place — _by which
numbers_ to judge the system, not just "works / doesn't work".

> **Demo context.** The project demonstrates architecture, not clinical production
> (see "Demo boundaries" in `architecture-overview.md`). Each metric therefore has two
> columns: what holds now (demo, on Cloudflare) vs. production targets for a clinical registry.

## 1. Availability

| Level            | Demo (now)                                                     | Production                                                       |
| ---------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| App availability | No SLA (best effort: Cloudflare Pages/Workers platform uptime) | ≥ 99.5 % / month (~3.6 h downtime/mo); 5xx SLO < 0.5 % requests  |
| Planned downtime | None planned, atomic deploy (Workers)                          | Outside clinic hours; rolling deploy, no window                  |
| Read degradation | Not implemented                                                | On DB outage — reads from cache/replica, writes to offline queue |

Demo gives **no availability guarantees**: single D1 instance + manual deploy.
Cloudflare itself is highly available, but no SLA is measured here
(no uptime monitoring/alerting — out of demo scope). The mechanics of deploying, rolling back and
restoring the database (including the built-in D1 Time Travel) are covered in
[deployment.md](./deployment.md).

## 2. RTO / RPO (disaster recovery)

| Metric                | Demo (now)                                                                          | Production                                              |
| --------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------- |
| RTO (service restore) | Not guaranteed; real path — redeploy from Git (`npm run deploy`)                    | ≤ 4 h (clean-repo redeploy + migrations)                |
| RPO (data loss)       | Not guaranteed. D1: manual migrations only; no regular backups, PITR, recovery plan | RPO ≤ 1 h (regular D1 backups / PITR), verified runbook |
| Verifiability         | —                                                                                   | Quarterly DR drills: DB restore from backup to staging  |

## 3. Performance

### 3.1. Frontend (Matrix widget)

Sources: `ru/matrix.md` §2, §5.1.

| Metric                 | Budget                                  | How verified                                                                                                                                                                     |
| ---------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First grid render      | ≤ 300 ms on reference dataset           | React Profiler / Chrome Performance                                                                                                                                              |
| Rerender on cell input | Exactly 1 cell; row/neighbors untouched | Now — unit tests of zustand selectors (`tests/unit/matrix-store.test.ts`); render-counters on the reference dataset (230 rows × 10 cols) are a target, not automated in the demo |
| Grid scroll            | No dropped frames (60 fps)              | Chrome Performance                                                                                                                                                               |
| Input/persist debounce | 300 ms (dirty-cell batch)               | unit tests matrix-store (fake timers)                                                                                                                                            |

### 3.2. Network & paging

| Metric             | Budget                                                                    | Rationale                                                                                     |
| ------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Patient list load  | ≤ 1 s TTI on reference dataset (20–50 paging, SSR)                        | Next.js App Router, D1 in one region                                                          |
| Collaboration sync | **Not implemented** (v1: others' edits surface only on write — CAS → 409) | Design option — polling 30–60 s (`matrix.md` §6.3, §6.7); no data loss possible thanks to CAS |

### 3.3. Security & server actions

Sources: `ru/auth.md` §6, `ru/spec-stage-3.md`.

| Metric                          | Budget                                                                                                 | Purpose          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------- |
| Login latency (success/failure) | Constant ~400 ms, same for existing/non-existing email                                                 | Anti-enumeration |
| Lockout after wrong passwords   | Login: 5 attempts → 15 min (stage 3); wrong current password on change does not lock; escalation — WAF | Rate-limit       |
| Session TTL                     | 12 h, sliding renewal                                                                                  | Auth             |

### 3.4. Scale / capacity (demo references)

| Metric                          | v1 value                                             | Review threshold                                                   |
| ------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| Binary clinical flags in schema | ~50 flat INTEGER 0/1 columns                         | >100–150 flags or per-flag attributes → hybrid (`ru/rdd-v1.md` §7) |
| Matrix virtualization           | Arbitrary row count (off-viewport rows not rendered) | —                                                                  |
| Build                           | Lighthouse/bundle size unregulated in demo           | Prod: per-route budget (e.g. LCP ≤ 2.5 s, CLS < 0.1)               |

## 4. Monitoring & alerting

Demo: missing (out of scope). Production must add: uptime probes (Cloudflare Health
Checks), 5xx + p95 Server Action alerting, D1-latency counters and `conflict_resolved`
from `audit_log` (background level as escalation-threshold baseline).
