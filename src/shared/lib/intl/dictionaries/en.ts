import type { ru } from './ru'

/**
 * Значение словаря: строка, массив строк или вложенный объект с такими же
 * значениями (`landing.forDoctors.list`). Форма повторяет структуру `ru`,
 * но строковые литералы заменяются на `string`, чтобы английские тексты
 * проходили проверку типов.
 */
type DictValue<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? DictValue<U>[]
    : T extends object
      ? { [K in keyof T]: DictValue<T[K]> }
      : T

export type DictShape = {
  [K in keyof typeof ru]: { [P in keyof (typeof ru)[K]]: DictValue<(typeof ru)[K][P]> }
}

/**
 * English UI strings, same keys as `ru` (checked via DictShape, not literal values —
 * literal `typeof ru` would freeze Russian strings as types and reject English text).
 * Clinical terms (HAM-D, remission, scales) reviewed manually — see docs/en/i18n.md.
 */
export const en: DictShape = {
  common: {
    appName: 'RDD · Depressive Disorders Registry',
    patients: 'Patients',
    reports: 'Reports',
    dataDictionary: 'Data Dictionary',
    documentation: 'Documentation',
    search: 'Search',
    save: 'Save',
    saving: 'Saving…',
    logout: 'Log out',
    backToList: '← back to list',
    open: 'Open →',
    download: 'Download',
    noData: 'No data',
    readOnly: 'Read-only access.',
    continueWork: 'Continue',
  },
  auth: {
    loginTitle: 'Sign in to registry',
    password: 'Password',
    login: 'Sign in',
    loggingIn: 'Signing in…',
    currentPassword: 'Current password',
    newPassword: 'New password',
    repeatNewPassword: 'Repeat new password',
    changePassword: 'Change password',
    passwordChanged: 'Password changed.',
  },
  patients: {
    title: 'Patients',
    newPatient: 'New patient',
    searchPlaceholder: 'Patient #',
    notFound: 'No patients found.',
    cardTitle: 'Patient',
    edit: 'edit',
    phases: 'Phases',
    matrix: 'Matrix →',
  },
  dataDictionary: {
    pageTitle: 'Data Dictionary',
    autoFrom: 'Auto-generated from the field registry',
    totalFields: 'Total fields',
    nullMeans:
      'NULL means the value is not filled; computed fields are not stored in the DB and are calculated on the fly.',
    colField: 'Field (ID)',
    colName: 'Name',
    colType: 'Type (logical/SQL)',
    colAllowed: 'Allowed values',
    colStorage: 'DB source',
    currentOnly: 'current status only',
    computed: 'computed',
    notStored: 'not stored (computed)',
  },
  landing: {
    badge: 'PhD, Bekhterev Institute, 2015',
    title: 'RDD — Depressive Disorders Registry',
    subtitle:
      'Specialized clinical web registry for longitudinal research on late-life depression. A showcase of Senior/Architect-level developer skills in building medical applications.',
    domainNote:
      'Built at the intersection of medicine and IT, and grounded in the author’s real 6-year clinical study.',
    login: 'Sign in to demo',
    about: 'About the project',
    docs: 'Architecture Overview (GitHub)',
    docsUrl: 'https://github.com/denzakh/rdd/blob/main/docs/en/architecture-overview.md',
    thesis: 'Thesis abstract (PhD)',
    thesisUrl:
      'https://github.com/denzakh/rdd-late-life-thesis/blob/main/en/abstract/abstract.en.md',
    targetAudienceTitle: 'Who the system serves and what task it solves',
    forDoctors: {
      title: 'For clinicians and researchers',
      list: [
        'Automates depression research',
        'Analyses every phase of the illness',
        'Connects history, mental status, treatment and outcomes',
        'Computes cohort statistics instantly',
        'Supports data export in several formats',
      ],
    },
    forTech: {
      title: 'For hiring managers and tech leads',
      list: [
        'Demonstrates medical application engineering skills',
        'Shows a deliberate, uncompromised architecture',
        'Single source of truth for the whole application',
        'Automatic synchronization of DB, validation and UI layers',
        'Zero cold start on serverless infrastructure',
      ],
    },
    capabilitiesTitle: 'Registry capabilities',
    cardPassportTitle: 'Patient passport and history',
    cardPassportText:
      'Interface for filling in the socio-demographic profile. Includes anonymized personal data and study-consent management. Some values are computed automatically — for example, the age at disease onset.',
    cardMatrixTitle: 'Disease-phase matrix',
    cardMatrixText:
      'A convenient interface for capturing the disease history. It is a matrix of depressive phases where the clinician, while interviewing the patient, can record symptoms across several episodes at once. It also tracks the state dynamics in the current phase.',
    cardReportsTitle: 'Analytics and export',
    cardReportsText:
      'Automatic computation of the key cohort metrics, presented in a clear visual form. Data export in several formats (Excel, CSV, JSON) for statistical analysis.',
    cardDictionaryTitle: 'Glossary of terms',
    cardDictionaryText:
      'A live glossary formed directly from the single field registry: clinicians see the clinical meaning of each sign, while engineers see types, validators and DB columns.',
    techHighlightsTitle: 'Key engineering decisions',
    highlightRegistryTitle: 'Registry-Driven Core (SSOT)',
    highlightRegistryText1:
      'A single declarative TS field registry generates the Cloudflare D1 (SQLite) schema, Zod validation schemas, UI input fields and the Data Dictionary. The “field = column” invariant rules out layer desynchronization.',
    highlightRegistryText2:
      'This approach speeds up development and reduces the number of errors: adding a new sign to the registry automatically updates every layer, including the DB migration, validation and UI.',
    highlightMatrixTitle: 'Virtualized grid with CAS',
    highlightMatrixText1:
      'TanStack Virtual + CSS Grid with sticky columns. Optimistic field locking (Compare-And-Swap).',
    highlightMatrixText2:
      'The interface stays fast even with large amounts of data, validates entered values automatically, supports several clinicians working together, and protects against data loss during concurrent editing of the same patient.',
    highlightEdgeTitle: 'Serverless Edge stack and security',
    highlightEdgeText1:
      'Next.js 16 on Cloudflare Workers + D1. Web Crypto cryptography, sessions in HttpOnly cookies, Row-Level Access and a hash-chain log for auditing mutations.',
    highlightEdgeText2:
      'The application starts instantly, with no heavy dependencies and low running cost even on large datasets. It runs on serverless infrastructure, which simplifies scaling, and all data is protected.',
    boundariesTitle: 'Demo boundaries and scope',
    boundariesText:
      'Populated with synthetic clinical records (zero real PII). Regulatory compliance (HIPAA / GDPR), edge WAF protection against L7 floods, and automated D1 point-in-time recovery are documented as production escalation milestones.',
    footerNote:
      'RDD — Clinical Depressive Disorders Registry · Demo showcase: synthetic data only, no real PII',
  },
  about: {
    title: 'About the RDD Project (Registry-Driven Development)',
    intro:
      'RDD is a specialized clinical web registry for longitudinal tracking of patients with recurrent depressive disorder, and simultaneously a full-stack architectural portfolio at Senior / Staff Engineer level. The system solves the primary challenge of clinical research: collecting deeply structured, longitudinal medical data with absolute guarantees against data loss and codebase desynchronization.',
    clinicalSectionTitle: '1. Clinical Context and Domain Expertise',
    clinicalBackground:
      'The registry data model is grounded in a 6-year study of recurrent depressive disorder in late-life patients conducted by the author at the V.M. Bekhterev National Medical Research Center for Psychiatry and Neurology (St. Petersburg, 2015, PhD in Psychiatry).',
    clinicalProblemTitle: 'What Clinical Problem Does It Solve?',
    clinicalProblemText:
      'In psychiatric research, traditional tooling (Excel spreadsheets, generic Google Forms surveys, systems like RedCap) rapidly hits a wall: it cannot validate the temporal sequence of affective phases, fails to tie pharmacotherapy switches to symptom dynamics, and allows conflicting entries. RDD moves clinical reasoning directly into the system architecture: a normalized patient passport and a dynamic phase matrix (1..N, admission, discharge) covering the clinical picture of phases and intermissions, treatment effectiveness, and psychometric rating scales.',
    archSectionTitle: '2. Architecture: Registry-Driven Core (SSOT)',
    archRegistryText:
      'The central problem of medical systems with dozens of clinical signs is the difficulty of adapting the application to changes in the study design. Whenever a change is introduced, there is a constant risk of desynchronization between the database schema, backend validation, UI form components, and the data dictionary. RDD implements the Single Source of Truth approach:',
    archRegistryPoint1:
      'A single declarative TypeScript object (src/shared/config/registry/) defines each field: SQLite data type, UI component, min/max bounds, clinical options, and calculation formulas.',
    archRegistryPoint2:
      'From this registry, gen:d1 generates D1 SQL migrations, Zod schemas are derived at runtime (to-zod.ts), UI form cards render declaratively, and the Data Dictionary updates with zero manual effort.',
    archRegistryPoint3:
      'The “Field = Column” invariant: binary clinical signs are flat INTEGER 0/1 columns. This eliminates opaque JSON blobs and heavy EAV patterns, enabling direct high-throughput SQL aggregations.',
    matrixSectionTitle: '3. High-Performance Phase Grid (Matrix)',
    matrixText:
      'Applications like this often suffer from poor usability when filling in clinical signs, and the interface can lag because of the sheer volume of data. We built the “phase matrix” — the clinician’s central tool that displays hundreds of cells of disease signs at once:',
    matrixPoint1:
      'Hybrid scrolling without JS synchronization: rows render via CSS Grid, where the left column with the sign name uses the native “position: sticky” rule. This ruled out desynchronization of independent scroll layers.',
    matrixPoint2:
      'TanStack Virtual row windowing: only rows within the visible viewport are kept in the DOM, guaranteeing high performance even on massive patient charts.',
    matrixPoint3:
      'Fine-grained Zustand store: editing a cell re-renders only that specific DOM node via subscription selectors, leaving the rest of the table untouched.',
    matrixPoint4:
      'Data-loss protection (Compare-And-Swap): concurrent edits by several clinicians are verified against the record version. On a conflict (HTTP 409 Conflict) the doctor sees the difference between their own value and the colleague’s version — silent overwrites are impossible by design.',
    edgeSectionTitle: '4. Edge Infrastructure, Audit, and Security',
    edgeText:
      'The application runs entirely on Cloudflare serverless edge infrastructure (Workers + Pages + D1 Database) with Next.js 16 App Router and zero cold start:',
    edgeCryptoText:
      'Web Crypto API: in the absence of node:crypto on Edge, password hashing is built on PBKDF2-SHA256 (600,000 iterations) with cryptographic salts. Session tokens exist strictly in HttpOnly; Secure; SameSite=Lax cookies, with SHA-256 digests stored in D1.',
    edgeRlsText:
      'Row-Level Access: declarative data_scope (all / site / assigned) is enforced at the repository query boundary, eliminating IDOR vulnerabilities.',
    edgeAuditText:
      'Tamper-evident audit log: every mutation and conflict resolution is batched atomically into audit_log alongside the data. Records are cryptographically hash-chained (prev_hash/entry_hash).',
    boundariesSectionTitle: '5. Demo Boundaries and Production Readiness',
    boundariesIntro:
      'This project demonstrates system architecture and domain depth. The technical specifications explicitly delineate current implementation from production deployment requirements:',
    boundariesScope1:
      'Demo scope: fully functional registry business logic running on synthetic clinical profiles on Cloudflare global edge.',
    boundariesScope2:
      'Production requirements: HIPAA/GDPR compliance, Cloudflare WAF against L7 floods, automated D1 Point-in-Time Recovery, and integration with hospital EHRs via HL7 FHIR.',
    archPoint1Label: '01. Description',
    archPoint2Label: '02. Generation',
    archPoint3Label: '03. Invariant',
    matrixPoint1Label: 'Hybrid scroll, no JS',
    matrixPoint2Label: 'TanStack virtualization',
    matrixPoint3Label: 'Atomic Zustand store',
    matrixPoint4Label: 'CAS version control (409)',
    boundariesScope1Label: 'Current demo scope',
    boundariesScope2Label: 'Production requirements',
    thesisLink: 'PhD Thesis Abstract (Bekhterev Institute)',
    thesisUrl:
      'https://github.com/denzakh/rdd-late-life-thesis/blob/main/en/abstract/abstract.en.md',
    docsLink: 'Architecture Overview (GitHub)',
    docsUrl: 'https://github.com/denzakh/rdd/blob/main/docs/en/architecture-overview.md',
    backHome: '← Back to Home',
    openDemo: 'Open Demo Interface',
  },

  docsHub: {
    title: 'Documentation',
    intro:
      'Curated digests instead of a mirror of every md file: full texts live on GitHub (docs/ru + docs/en) and are never copied into runtime.',
    architectureTitle: 'Architecture (digest)',
    architectureText:
      'The field registry is the source of truth: one TS registry generates the D1 schema, Zod validation and the UI. The phase matrix renders through a visibility window, concurrent edits surface as CAS conflicts (409), and audit is written in one batch with the mutation.',
    architectureLink: 'architecture-overview.md on GitHub',
    architectureUrl: 'https://github.com/denzakh/rdd/blob/main/docs/en/architecture-overview.md',
    securityTitle: 'Security: threat → measure → where',
    securityText:
      'A digest of auth.md and threat-model.md (STRIDE); full tables via the links below.',
    securityColThreat: 'Threat',
    securityColMeasure: 'Measure',
    securityColWhere: 'Where',
    securityRow1: 'Password guessing and login enumeration',
    securityMeasure1:
      'Rate limit on sign-in; identical response time for existing and non-existing emails',
    securityWhere1: 'auth.md §6',
    securityRow2: 'Session hijacking via cookie',
    securityMeasure2:
      'Own D1 sessions: HttpOnly cookie, sliding TTL, only the token hash is stored in the DB',
    securityWhere2: 'auth.md §5',
    securityRow3: 'IDOR: a clinician sees other clinicians’ patients',
    securityMeasure3:
      'Row-level access: per-user data_scope plus a scoped repository on every query',
    securityWhere3: 'auth.md — Row-level access',
    securityRow4: 'Mutation bypassing the UI (readonly role)',
    securityMeasure4:
      'Double check: canWrite() in every Server Action plus a field whitelist and Zod schema',
    securityWhere4: 'spec-stage-1 §1, §3',
    securityRow5: 'Data and audit tampering',
    securityMeasure5:
      'actor_id on every mutation; append-only audit_log with a hash chain verified by verifyChain()',
    securityWhere5: 'matrix.md §6.6',
    securityAuthLink: 'auth.md on GitHub',
    securityAuthUrl: 'https://github.com/denzakh/rdd/blob/main/docs/en/auth.md',
    securityThreatLink: 'threat-model.md on GitHub',
    securityThreatUrl: 'https://github.com/denzakh/rdd/blob/main/docs/en/threat-model.md',
    nfrTitle: 'NFR / RTO / RPO (digest)',
    nfrText:
      'Demo: no SLA — a single D1 instance and manual deploys. Production targets: availability ≥ 99.5 % per month, 5xx SLO < 0.5 %, RTO ≤ 4 h, RPO ≤ 1 h, patient list TTI ≤ 1 s.',
    nfrLink: 'nfr.md on GitHub',
    nfrUrl: 'https://github.com/denzakh/rdd/blob/main/docs/en/nfr.md',
    roadmapTitle: 'Roadmap: spec-stage-1..4 ✅',
    roadmapText:
      'spec-stage-1..4 ✅: real mutations and audit, entities and patient pages, auth v1.5 (password change, rate limit, invites), quality and CI. Beyond the plan — row-level access (data_scope) and consent v1; collab mode (polling) is planned.',
    roadmapLink: 'roadmap.md on GitHub',
    roadmapUrl: 'https://github.com/denzakh/rdd/blob/main/docs/en/roadmap.md',
    dictionaryTitle: 'Live Data Dictionary',
    dictionaryText:
      'The one registry-driven runtime example: the page is built from the same TS field registry as the D1 schema, so it is not retold here.',
    dictionaryLink: 'Open /data-dictionary →',
  },
} as const
