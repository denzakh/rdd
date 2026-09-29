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
    email: 'Email',
    password: 'Password',
    login: 'Sign in',
    loggingIn: 'Signing in…',
    /** Demo test account login (pre-filled into the login form). */
    testEmail: 'test@testmaul.com',
    /** Hint under the form: the test password is ten digits from one down to zero. */
    testPasswordHint:
      'Test sign-in: the password is ten digits in a row, from one down to zero — one, two, three, four, five, six, seven, eight, nine, zero.',
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
    edgeCryptoTitle: 'Web Crypto API',
    edgeRlsTitle: 'Row-level access',
    edgeAuditTitle: 'Tamper-evident audit log',
    edgeCryptoText:
      'Web Crypto API: in the absence of node:crypto on Edge, password hashing is built on PBKDF2-SHA256 (100,000 iterations) with cryptographic salts. Session tokens exist strictly in HttpOnly; Secure; SameSite=Lax cookies, with SHA-256 digests stored in D1.',
    edgeRlsText:
      'Row-level access: each user is given a visibility width (data_scope) — “all”, “own center” (site) or “assigned patients” (assigned). The repository adds the filter to every query, so a direct link cannot open someone else’s chart (IDOR).',
    edgeAuditText:
      'An audit log that cannot be rewritten: every change is written to audit_log in the same transaction as the data, and entries are chained by hashes (prev_hash/entry_hash) — history cannot be tampered with unnoticed.',
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
    docsHubLink: 'Project Documentation',
    docsHubUrl: '/docs',
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
              'A clinical study has more than 50 clinical fields. For every field, validation, the UI element and the value in the DB schema have to be defined. If these values were described in three places, they would inevitably drift apart as the app changes.',
            solution:
              'One TS registry generates the D1 schema, the Zod schemas, the input fields, the matrix and the data dictionary.',
            why: 'With this setup a single edit in the registry updates every related place at once. That makes changes fast, easy and safe.',
            ref: 'rdd-v1.md §3',
            file: 'rdd-v1.md',
          },
          {
            title: 'Storing binary signs',
            problem:
              'A clinical study can have many signs that take YES or NO values (symptoms, therapy, remission). We had to choose how to store them: separate columns, a sign-value table, a bitmask, or a single JSON column.',
            solution: 'Every sign is stored as a separate column (0/1).',
            why: 'While the number of signs is small (fewer than 150), plain columns are simply more convenient. They make export and edits easy, fit the single-registry logic, and allow fast symptom search without extra load on the database.',
            ref: 'rdd-v1.md §7',
            file: 'rdd-v1.md',
          },
          {
            title: 'Protocol versions without database migrations',
            problem:
              'The signs being studied and the ways of filling them in can change, while the values already entered stay as they are. A year later it is no longer clear what the doctor meant when entering an answer under the old wording.',
            solution:
              'Every record is tagged with a protocol version number, and the versions themselves are described in a separate registry. An entry in an old field stays, but is marked as retired. The database schema is not restructured.',
            why: 'Data entered earlier is never rewritten: the export shows which protocol version filled in each row, so answers from different revisions cannot be mixed up.',
            ref: 'schema-evolution.md',
            file: 'schema-evolution.md',
          },
          {
            title: 'Live data dictionary',
            problem:
              'A doctor needs to know what each sign means and what answers it allows, while a developer needs to know the data type and which table holds it. Describing this by hand means that when signs are added or edited, it is easy to forget to update the description — and the documentation drifts away from the real database.',
            solution:
              'The dictionary is built from the same registry as the rest of the app. When the registry is edited, the dictionary changes automatically.',
            why: 'Clinicians see the clinical meaning of a sign, developers see types and column names, and both read the same single source — so the description and the database cannot fall out of sync.',
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
            title: 'Phase matrix: hundreds of signs without lag',
            problem:
              'During one appointment a clinician fills in signs across several episodes of the disease at once — that is hundreds of cells. A plain table with that much data becomes sluggish, and a pinned column of sign names has to be scroll-synchronized by hand.',
            solution:
              'Virtualization with TanStack Virtual combined with CSS Grid: only the visible rows are loaded, and the left cell of every row is held in place by the browser itself (position: sticky).',
            why: 'There is no second scroll layer at all and only visible rows live in the page, so the response stays instant even with hundreds of signs.',
            ref: 'matrix.md §1–2',
            file: 'matrix.md',
          },
          {
            title: 'Edits without data loss: compare and merge (CAS)',
            problem:
              'Two clinicians may edit the same phase at the same time, and no edit may be lost. Simple locking by modification time would only reject the second attempt and silently throw away the clinician’s work.',
            solution:
              'The row version is compared against the updated_at field in the SQLite database itself, and differences are shown to the clinician cell by cell or for the whole phase — with a “mine / theirs” choice.',
            why: 'The clinician’s computer clock is not treated as the source of truth, and every conflict resolution is written to the audit log.',
            ref: 'matrix.md §6',
            file: 'matrix.md',
          },
          {
            title: 'Data export without personal data',
            problem:
              'A researcher needs a ready-made dataset for R or Python analysis that contains no direct patient identifiers — no names, dates of birth or medical record numbers.',
            solution:
              'First a single de-identified dataset is assembled, and plain CSV, JSON and XLSX exports are produced from it; frequent export requests are rate-limited.',
            why: 'Personal data is stripped once — before the dataset is turned into a file — so a new export format physically cannot slip it through.',
            ref: 'export.md',
            file: 'export.md',
          },
          {
            title: 'Patient consent: the fact is recorded, not the scan',
            problem:
              'Enrolling a patient in a study has to be legally recorded, even though the informed consent form text and the signature are not stored in the system.',
            solution:
              'The consent date is set automatically when the record is created, the form version is kept in a text field, and withdrawal of consent is a separate action.',
            why: 'The system keeps the date, the form version and the fact of withdrawal — enough to prove the procedure was followed. Scans and electronic signatures are deliberately out of scope.',
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
            title: 'Password sign-in where there is no server of our own',
            problem:
              'A clinician signs in with a password, and it must never be stored in the clear. The app runs on Cloudflare Workers without Node.js, so the usual bcrypt and argon2 do not run there either.',
            solution:
              'The password is kept as a one-way PBKDF2-SHA256 hash with 100 thousand iterations. The session token lives only in a cookie marked HttpOnly, Secure and SameSite=Lax, and the D1 database holds nothing but its SHA-256. A session lasts 12 hours, is extended during active work, and never exceeds 7 days from sign-in.',
            why: 'A database leak does not grant access: the password can only be brute-forced and the token cannot be reconstructed from its SHA-256. A stolen token buys at most 7 days of access, not an unlimited one.',
            ref: 'auth.md §2, §4–5',
            file: 'auth.md',
          },
          {
            title: 'Chart access: whose chart is this',
            problem:
              'A doctor sees every patient chart by default — swap someone else’s ID into the URL and you get their chart (IDOR).',
            solution:
              'Each user has a data_scope setting — “all”, “own center” (site) or “assigned patients” (assigned). The repository adds the filter itself to every query, including lookups by ID (findById).',
            why: 'A direct link cannot show you more than the list does — the filter applies in both places. And if a user has no center set, the “own center” mode shows nothing at all — nothing is better than something extra.',
            ref: 'auth.md — Row-level access',
            file: 'auth.md',
          },
          {
            title: 'An audit log that cannot be rewritten',
            problem:
              'In a patient chart you have to be able to tell who changed what and when — otherwise the changes cannot be proven.',
            solution:
              'Every change is written to the audit_log in the same transaction as the data itself. Entries can only be appended: the database refuses to change or delete them. Each entry is also chained to the previous one by a hash, so the chain cannot be cut unnoticed.',
            why: 'The verifyChain() check catches history rewritten after the fact. And the log keeps no second copy of the chart — it refers to the patient by ID and stores only the values of the fields that changed.',
            ref: 'matrix.md §6.6',
            file: 'matrix.md',
          },
          {
            title: 'Two lines of defence for pages',
            problem:
              'A page that the interface hides but the server never checks stays reachable through a direct link — from browser history or from the list of visited pages.',
            solution:
              'The first line is a cookie check in middleware: it is fast and turns away most requests. The second is the requireUser() function, which validates the session in the database on every call.',
            why: 'Checks in the user interface do not count as protection, and every data change additionally asks for write permission (canWrite).',
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
            title: 'Cloud hosting that starts instantly',
            problem:
              'Medical data needs hosting you do not have to maintain by hand: no server of your own, no manual patching, and no waiting for the app to warm up after an idle period.',
            solution:
              'The app runs on the Cloudflare cloud platform: code on Workers, the database in D1, and one command releases it through open-next. The site opens right away — there is nothing to warm up.',
            why: 'No long-running servers and no configuration to keep secret: the whole app is code plus a database.',
            ref: 'deployment.md',
            file: 'deployment.md',
          },
          {
            title: 'Service reliability and acceptable data loss',
            problem:
              'The demo version has no service level agreement: it is unclear what is already guaranteed and what remains a goal for production use.',
            solution:
              'Concrete numbers are written down: the share of time the service is available (availability) and the allowed share of 5xx errors, recovery time of at most 4 hours (RTO), data loss of at most 1 hour (RPO), plus performance thresholds for the matrix and the network.',
            why: 'Numbers instead of slogans: they show exactly what moves into a production environment.',
            ref: 'nfr.md',
            file: 'nfr.md',
          },
          {
            title: 'Automated quality checks on every build',
            problem:
              'A mistake in the medical logic — a broken registry rule or a wrong conflict resolution — is usually noticed by a clinician during real work, not by a test.',
            solution:
              'Every change is checked in GitHub Actions: style check, type check, the feature-sliced design layer rule (steiger), and unit and integration tests against a local D1 database.',
            why: 'The invariants of the registry, of version comparison and of the audit log are verified before a deploy, not after a complaint.',
            ref: 'spec-stage-4.md',
            file: 'spec-stage-4.md',
          },
          {
            title: 'Manual deploy and rollback',
            problem:
              'Automatic deploys are dangerous for medical data: schema migrations and operations on the production database must stay under a human’s control.',
            solution:
              'A release is a single npm run deploy command, a code rollback means switching back to the previous worker version, and data is handled only per checklist: dump first, restore second.',
            why: 'Production operations require an explicit human action, which noticeably lowers the risk of irreversible changes.',
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
        threat: 'IDOR: a clinician sees other patients’ charts',
        measure:
          'Per-user visibility scope (data_scope) plus a repository filter on every query, findById included',
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
    limitsTitle: 'What this version does not do',
    limitsText:
      'This is a demo version: the whole clinician workflow works here — patient record, phase matrix, roles, audit and data export — but the data is synthetic rather than real medical data. Nothing below was forgotten or left broken: each item would require a separate project with its own budget and timeline, so it is deliberately out of scope for this version and written down in the documentation as the point where the work moves to the next stage. Everything described here can be verified in the code and in the tests; everything that is missing here is a matter of separate work with lawyers, the security team and operations.',
    limits: [
      'Compliance with personal-data and medical-record regulation (Russian personal-data law, 152-FFZ, and HIPAA in the US), agreements with data processors, e-signature for patient consent.',
      'Encryption of data at rest, separate key storage, and separation of the demo and production environments.',
      'Regular database backups, point-in-time recovery, and a tested disaster recovery plan.',
      'Data retention policies and deletion of a patient record together with the audit log, which cannot be rewritten.',
      'Instant screen updates for a second clinician: data is currently re-fetched by polling the server every 30–60 seconds rather than over a persistent connection (WebSocket or SSE).',
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
