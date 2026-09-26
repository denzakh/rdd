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
    /** Admin-only menu item pointing to the user-management page. */
    userManagement: 'Users',
    /** Label of the `/change-password` link in the header (key icon). */
    changePasswordLink: 'Change password',
    /** Label of the header logo link (points to the `/` landing page). */
    home: 'Home',
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
  /** User management UI (`/admin/users`). */
  admin: {
    pageTitle: 'Users',
    colEmail: 'Email',
    colName: 'Name',
    colRole: 'Role',
    colVisibility: 'Patient visibility',
    colLock: 'Lock',
    colCreated: 'Created',
    colActions: 'Actions',
    scopeAll: 'all patients',
    scopeSite: 'own center',
    scopeAssigned: 'assigned only',
    sitePlaceholder: 'center',
    lockedUntil: 'until',
    failedAttempts: 'failed: ',
    lockUser: 'Block',
    unlockUser: 'Unblock',
    resetPassword: 'Reset password',
    newUserTitle: 'New user',
    namePlaceholder: 'Name',
    siteFullPlaceholder: "Center (site), for 'own center'",
    seesPrefix: 'sees: ',
    create: 'Create',
    passwordFor: 'Password for',
    shownOnce: '(shown once)',
    newInviteTitle: 'New invite (link lives 7 days)',
    colExpires: 'Expires',
    linkOnce: 'Link (shown once):',
    revoke: 'Revoke',
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
      'A short brief per capability: which problem it solves, what was chosen and why. The full write-ups with escalation thresholds live in the repository docs (docs/ru and docs/en) and are never copied into runtime.',
    featuresTitle: 'Capabilities and the decisions behind them',
    problemLabel: 'Problem',
    solutionLabel: 'Decision',
    whyLabel: 'Why',
    groups: [
      {
        id: 'data',
        title: 'Data and schema',
        cards: [
          {
            title: 'Single field registry (SSOT)',
            problem:
              '50+ clinical fields: the DB schema, validation and the UI would be described in three places and would inevitably drift apart.',
            solution:
              'One TS registry generates the D1 schema, the Zod schemas, the input fields, the matrix and the data dictionary.',
            why: 'The “field = column” invariant: a new or fixed field is a single edit in the registry.',
            ref: 'rdd-v1.md §3',
            file: 'rdd-v1.md',
          },
          {
            title: 'Binary signs as flat 0/1 columns',
            problem:
              'Dozens of diagnostic flags (symptoms, therapy, remission): columns, EAV, a bitmask or JSON?',
            solution:
              'Flat INTEGER 0/1 inside the shared registry schema — five options were considered and this one won.',
            why: 'Aggregates come down to a single WHERE col = 1, while a JSON column would drop the sign out of the “registry → UI” chain.',
            ref: 'rdd-v1.md §7',
            file: 'rdd-v1.md',
          },
          {
            title: 'Protocol versioning without migrations',
            problem:
              'The CRF changes while enrollment is ongoing: what does a value entered before an ethics-committee amendment mean?',
            solution:
              'registry_version on the record plus a registry of versions; the schema only changes through a full DB reset.',
            why: 'Historical values are never rewritten, and the export carries the protocol version on every row.',
            ref: 'schema-evolution.md',
            file: 'schema-evolution.md',
          },
          {
            title: 'Live data dictionary',
            problem: 'A hand-written field table goes stale right after the first registry edit.',
            solution:
              'The /data-dictionary page is built from the same registry the D1 schema is generated from.',
            why: 'Clinicians see the clinical meaning of a sign, engineers see types and columns; drift is impossible.',
            ref: 'data-dictionary.md',
            file: 'data-dictionary.md',
          },
        ],
      },
      {
        id: 'clinical',
        title: 'Clinician workflow',
        cards: [
          {
            title: 'Phase matrix over hundreds of signs',
            problem:
              'Hundreds of cells across episodes: a plain table lags, and a pinned column with a header needs manual scroll synchronization.',
            solution:
              'TanStack virtualization plus CSS Grid, where the left cell of every row uses native position: sticky.',
            why: 'No second scroll layer at all, only the visible rows live in the DOM, so interaction stays instant.',
            ref: 'matrix.md §1–2',
            file: 'matrix.md',
          },
          {
            title: 'Edits without data loss (CAS)',
            problem:
              'Two clinicians edit the same phase: naive optimistic locking just rejects the second patch and silently loses the work.',
            solution:
              'Comparison against updated_at from SQLite plus conflict resolution at cell or phase level with a “mine / theirs” diff.',
            why: 'Client clocks are not trusted, and every conflict resolution is written to the audit log.',
            ref: 'matrix.md §6',
            file: 'matrix.md',
          },
          {
            title: 'De-identified export',
            problem: 'Researchers need a dataset for R/Python without direct patient identifiers.',
            solution:
              'One aggregated de-identified dataset, then thin CSV/JSON/XLSX adapters on top plus export throttling.',
            why: 'PII is stripped once before serialization, so a new format physically cannot leak it.',
            ref: 'export.md',
            file: 'export.md',
          },
          {
            title: 'Patient consent',
            problem:
              'Enrollment in a study must be legally recorded, yet the consent text and the signature are not stored in the system.',
            solution:
              'The consent date is set automatically when the record is created, the form version is a text field, and withdrawal is a separate action.',
            why: 'The system keeps only the date, the version and the fact of withdrawal; scans and e-signatures are deliberately out of scope.',
            ref: 'consent.md',
            file: 'consent.md',
          },
        ],
      },
      {
        id: 'access',
        title: 'Access and security',
        cards: [
          {
            title: 'Passwords and sessions on the edge',
            problem:
              'Cloudflare Workers has no node:crypto, so bcrypt/argon2 are not available natively.',
            solution:
              'PBKDF2-SHA256 through Web Crypto (600k iterations) and own sessions in D1, with the token living only in an HttpOnly cookie.',
            why: 'A database leak does not hijack sessions: D1 only holds the SHA-256 of the token.',
            ref: 'auth.md §2, §4–5',
            file: 'auth.md',
          },
          {
            title: 'Row-level access: whose chart is this',
            problem:
              'The clinician role sees every patient by default — through a direct link to a chart that is already an IDOR.',
            solution:
              'data_scope (all / site / assigned) is encapsulated in the repository: the filter applies to every query, findById included.',
            why: 'Lists and direct links behave identically, and a site without a center binding sees nothing (fail closed).',
            ref: 'auth.md — Row-level access',
            file: 'auth.md',
          },
          {
            title: 'An audit log that cannot be rewritten',
            problem:
              'In a clinical chart it matters who changed what and when — otherwise changes are unprovable.',
            solution:
              'An append-only audit_log is written in the same db.batch as the data, UPDATE/DELETE are blocked by triggers, and entries are linked by a hash chain.',
            why: 'verifyChain() detects retrospective tampering, and PII is never duplicated into the log.',
            ref: 'matrix.md §6.6',
            file: 'matrix.md',
          },
          {
            title: 'Two-tier route protection',
            problem:
              'A page without a server-side check stays reachable through a direct link from browser history.',
            solution:
              'Middleware on cookie presence (fast) plus requireUser() validating the session in the DB (strict).',
            why: 'UI checks are not protection: every mutating action additionally asks canWrite().',
            ref: 'auth.md §7',
            file: 'auth.md',
          },
        ],
      },
      {
        id: 'ops',
        title: 'Operations and quality',
        cards: [
          {
            title: 'Cloudflare edge with no cold start',
            problem:
              'A self-hosted VPS holding medical data is an extra perimeter, manual patching and cold starts.',
            solution:
              'Next.js on Workers and D1 through open-next, released with a single command and zero warm-up time.',
            why: 'No stateful instances and no secrets: the whole perimeter is static code plus a database.',
            ref: 'deployment.md',
            file: 'deployment.md',
          },
          {
            title: 'NFR: availability and RTO/RPO',
            problem:
              'A demo without an SLA: what is guaranteed today and what stays a production goal.',
            solution:
              'Availability and the 5xx SLO, RTO ≤ 4 h, RPO ≤ 1 h, plus performance thresholds for the matrix and the network are all written down.',
            why: 'Numbers instead of slogans: they show exactly what moves into a production environment.',
            ref: 'nfr.md',
            file: 'nfr.md',
          },
          {
            title: 'CI and quality gates',
            problem: 'Regressions in medical logic are noticed by a clinician, not by a test.',
            solution:
              'GitHub Actions: lint + tsc + steiger (FSD layers) plus unit and integration tests against a local D1.',
            why: 'Registry, CAS and audit invariants are verified before a deploy, not after a complaint.',
            ref: 'spec-stage-4.md',
            file: 'spec-stage-4.md',
          },
          {
            title: 'Manual deploy and rollback',
            problem:
              'Auto-deploy is dangerous: migrations and production-data operations must stay under human control.',
            solution:
              'A release is npm run deploy, a code rollback is returning to the previous worker version, and data is handled by dump and reset per checklist.',
            why: 'Production operations require an explicit action, which lowers the risk of irreversible changes.',
            ref: 'deployment.md §8',
            file: 'deployment.md',
          },
        ],
      },
    ],
    securityTitle: 'Security: threat → measure',
    securityText:
      'A digest of auth.md and threat-model.md (STRIDE); full tables via the links below.',
    securityColThreat: 'Threat',
    securityColMeasure: 'Measure',
    securityColWhere: 'Where',
    securityRows: [
      {
        threat: 'Password guessing and login enumeration',
        measure:
          'Sign-in rate limit (5 failures → 15 min lockout); identical response time for existing and non-existing emails',
        where: 'auth.md §6',
        file: 'auth.md',
      },
      {
        threat: 'Session hijacking via cookie',
        measure:
          'Own D1 sessions: HttpOnly cookie, sliding 12 h TTL, only the SHA-256 of the token in the DB',
        where: 'auth.md §5',
        file: 'auth.md',
      },
      {
        threat: 'IDOR: a clinician sees other clinicians’ patients',
        measure:
          'Row-level access: per-user data_scope plus a scoped repository on every query, findById included',
        where: 'auth.md — Row-level access',
        file: 'auth.md',
      },
      {
        threat: 'Mutation bypassing the UI (readonly role)',
        measure:
          'Double check: canWrite() in every Server Action plus a field whitelist and a Zod schema',
        where: 'spec-stage-1.md §1, §3',
        file: 'spec-stage-1.md',
      },
      {
        threat: 'Data and audit tampering',
        measure:
          'actor_id on every mutation; append-only audit_log with a hash chain verified by verifyChain()',
        where: 'matrix.md §6.6',
        file: 'matrix.md',
      },
    ],
    quickTitle: 'Live sections of the app',
    quickText: 'These pages are built from the very code described above.',
    quickLinks: [
      {
        label: 'Data Dictionary',
        href: '/data-dictionary',
        note: 'every registry field with types and columns',
      },
      {
        label: 'Reports and export',
        href: '/reports',
        note: 'cohort aggregates plus CSV/JSON/XLSX download',
      },
      { label: 'Patients', href: '/patients', note: 'patient records filtered by data_scope' },
    ],
    limitsTitle: 'Boundaries of the demo',
    limitsText:
      'Not “forgotten” but deliberately out of scope: each item would require a separate body of work and is documented with an escalation threshold.',
    limits: [
      'Compliance and regulation (HIPAA / personal-data law), DPAs with processors, e-signature for consent.',
      'Encryption at rest (BYOK/KMS) and separation of demo and production environments.',
      'Regular D1 backups, point-in-time recovery and a disaster recovery plan.',
      'Retention policies and patient deletion together with the append-only audit log.',
      'Active collaboration sync: 30–60 s polling instead of WebSocket/SSE.',
    ],
    limitsRef: 'architecture-overview.md — “Boundaries of the demo project”',
    limitsFile: 'architecture-overview.md',
    docsTitle: 'Documentation in the repository',
    docsText:
      'The full texts live in the repository as mirrored docs/ru and docs/en sets — the section links above point straight into them.',
    docsLinks: [
      {
        file: 'architecture-overview.md',
        note: 'entry point: key decisions, security digest, demo boundaries',
      },
      { file: 'rdd-v1.md', note: 'the core: field registry, D1 schema generation, computations' },
      { file: 'auth.md', note: 'passwords, sessions, roles, row-level access' },
      { file: 'matrix.md', note: 'phase matrix: virtualization, CAS, audit' },
      { file: 'export.md', note: 'de-identified export and throttling' },
      { file: 'schema-evolution.md', note: 'protocol versioning and schema evolution' },
      { file: 'data-dictionary.md', note: 'how the auto-generated data dictionary works' },
      { file: 'consent.md', note: 'patient consent: date and version of the form' },
      { file: 'nfr.md', note: 'availability, RTO/RPO, performance thresholds' },
      {
        file: 'deployment.md',
        note: 'deploy, domain, CI, production DB, rollback and diagnostics',
      },
      { file: 'threat-model.md', note: 'formalized threat model (STRIDE)' },
      { file: 'roadmap.md', note: 'stages 1–6 implemented, stage 7 planned' },
    ],
  },
} as const
