# Spec: patient consent — date and ICF form version (./consent.md)

**Status:** decision fixed · **Dependencies:** patient registry and card (`spec-stage-2.md` §2, §4)
**FSD layer:** `src/entities/patient/api/patient-repo.ts`, `src/features/patients/*`, `app/patients/*`

---

## 1. Decision (accepted)

- **The consent date is set automatically when the card is created**: `patients.consent_date` = creation date (ISO day). Study inclusion and consent-date registration are one act (`savePatientAction` → `createPatientRepository().create()`).
- **The default ICF version is `1`** (`CONSENT_CURRENT_VERSION`). It is rendered as a **text field on the patient registration page** and can be edited later on the card edit page: the clinician increments the version when the consent text changes.
- **Consent withdrawal stays a separate action** (`patients.consent_withdrawn_at`, button on the card): data is not deleted physically, the patient is excluded from reports/export (`entities/phase/api/queries.ts`, `entities/patient/api/queries.ts`).
- **Consent fields are not part of the statistical export**: `consent_version`, `consent_date`, `consent_withdrawn_at` are absent from `getDeidentifiedDataset` (the "withdrawn → excluded from the query" filter still applies). The ICF revision label is needed for ethics-committee reconciliation, not for biostatistics.
- **The register of consent text revisions lives outside the system** (ethics committee decision): only the version number is stored. The consent text itself is not stored (neither in D1 nor in object storage).

### 1.1 Implementation points

| What                                      | Where                                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Date + default version on creation        | `src/entities/patient/api/patient-repo.ts` (`create`, `CONSENT_INSERT_COLUMNS`, `todayIsoDate`) |
| Version from the form (create and edit)   | `src/features/patients/api/actions.ts` (`savePatientAction`, field `consent_version`)           |
| Version text field                        | `src/features/patients/ui/patient-form.tsx`                                                     |
| Default value on pages                    | `app/patients/new/page.tsx`, `app/patients/[id]/edit/page.tsx`                                  |
| Consent panel (sign/withdraw)             | `src/features/patients/ui/consent-panel.tsx`                                                    |
| Rule "withdrawn → out of reports"         | `src/entities/phase/api/queries.ts`, `src/entities/patient/api/queries.ts`                      |
| Guard "consent fields never exported"     | `tests/unit/export-no-consent.test.ts`                                                          |
| Consent-on-create tests                   | `tests/integration/consent-filter.test.ts`                                                      |
| Demo data (consent date = inclusion date) | `scripts/seed-demo.ts`                                                                          |

### 1.2 Consent states on the card

| State                   | Condition                                                      | Button             |
| ----------------------- | -------------------------------------------------------------- | ------------------ |
| signed                  | `consent_version IS NOT NULL AND consent_withdrawn_at IS NULL` | "Withdraw consent" |
| withdrawn               | `consent_withdrawn_at IS NOT NULL`                             | "Sign consent"     |
| not registered (legacy) | both columns `NULL`                                            | "Register consent" |

The "not registered" state can only occur for records created before this decision (or inserted directly via the repository/seed) — new cards never get it. An unregistered consent **cannot** be withdrawn: otherwise the patient would drop out of reports without a reason.

## 2. Deliberately not implemented

- no consent-version register (`consent_versions`); `consent_version` is `TEXT` without an FK;
- no consent text in the system;
- no e-signature, DPAs or other legally binding mechanisms (demo boundaries — `architecture-overview.md`, "Demo boundaries" section);
- no dedicated signature-history table (partially covered by `audit_log`: a card update writes the whole `old_value`/`new_value`, including the version);
- no consent label in the statistical export.

## 3. Escalation options (trigger → action)

| Trigger                                                                                  | What to do                                                                                                                                                                                                                                                             | Cost                                                                                                                       |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Version mismatch/typo: wrong number signed, "forgot to increment"                        | `consent_versions(version TEXT PRIMARY KEY, effective_at, note, approved_by)` register + version validation in `signConsent` + a guard test "`CONSENT_CURRENT_VERSION` == last register version"; following the `registry_versions` pattern (`schema-evolution.md` §4) | manual migration `000N_consent_versions.sql` (+ `MANUAL_MIGRATIONS` in `scripts/db-restart.ts`), repository changes, tests |
| The signed revision text must be shown to a clinician (or patient)                       | revision text in the register in D1 (TEXT/Markdown, revisions immutable: editing text = a new version) + rendering in `ConsentPanel`, page `/admin/consent-versions`                                                                                                   | register + UI + i18n                                                                                                       |
| A legally significant primary source (signed scan/PDF) is required                       | scan in R2 (`MY_BUCKET` is declared in `wrangler.jsonc`, unused by code) + authorized download, linked from the version register                                                                                                                                       | a separate access-control contour; beyond the declared demo boundaries                                                     |
| Full signature history is required (who, when, which revision; re-signings, withdrawals) | a signature table `patient_consents(patient_id, version, signed_at, withdrawn_at, actor_id)` written from `signConsentAction`/`withdrawConsentAction`                                                                                                                  | migration + repository/action changes                                                                                      |
| An external requirement to include the ICF label in the export                           | return `consent_version` to `getDeidentifiedDataset` (columns/meta) following `registry_version`, and **deliberately** rewrite the guard test `tests/unit/export-no-consent.test.ts`                                                                                   | ~10 lines                                                                                                                  |
| Unsigned patients must be excluded from reports                                          | add `consent_version IS NOT NULL` to `CONSENT_OK` (`entities/patient/api/queries.ts`) and to the phase queries; note that legacy records without a version will drop out of statistics                                                                                 | a few SQL queries + tests                                                                                                  |

The escalation threshold is an **external requirement** (ethics committee, regulator, audit), not "just in case": every complication (register, text, signed scan) adds a maintenance and liability contour.
