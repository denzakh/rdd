# RDD development roadmap (./roadmap.md)

**Purpose:** a summary plan of improvements after v1 (registry core + auth + demo matrix are ready).
Each stage has a separate spec: `spec-stage-1.md` … `spec-stage-4.md`.

| Stage                         | Spec                     | Essence                                                                        | Status         |
| ----------------------------- | ------------------------ | ------------------------------------------------------------------------------ | -------------- |
| 1. Real data mutations        | `spec-stage-1.md`        | Server Actions for saving phases, CAS conflicts, audit with actor_id           | ✅ implemented |
| 2. Entities and patient pages | `spec-stage-2.md`        | `entities` layer, patient pages, matrix binding to patient_id, aggregates      | ✅ implemented |
| 3. Auth v1.5                  | `spec-stage-3.md`        | Password change, rate-limit, admin-UI, invites                                 | ✅ implemented |
| 4. Quality and infrastructure | `spec-stage-4.md`        | Tests, CI, README, docs update                                                 | ✅ implemented |
| 5. Row-level access           | `./auth.md`              | "whose card" binding: `data_scope` (all/site/assigned), scope-repository       | ✅ implemented |
| 6. Consent v1                 | `./consent.md`           | Consent date on inclusion, ICF version in the registration form, not in export | ✅ implemented |
| 7. Collab mode (polling)      | `./matrix.md` §6.3, §6.7 | Background sync of others' edits without reload (30–60 s)                      | 📋 planned     |

The order is strict: stage 1 removes the "demo" status from the matrix and is a blocker for everything else.
