import type { ru } from './ru'

export type DictShape = {
  [K in keyof typeof ru]: { [P in keyof (typeof ru)[K]]: string }
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
      'Specialized clinical web registry for longitudinal tracking and analysis of late-life depressive disorders. Engineering showcase at Senior/Architect level: single TS field registry, virtualized phase matrix, and serverless Cloudflare Edge runtime.',
    domainNote:
      'Built at the intersection of medicine and engineering: the phase structure, pharmacotherapy dynamics, and remission criteria stem from the author’s 10-year clinical PhD research.',
    login: 'Sign in to demo',
    about: 'About the project',
    docs: 'Architecture Overview (GitHub)',
    docsUrl: 'https://github.com/denzakh/rdd/blob/main/docs/en/architecture-overview.md',
    thesis: 'Thesis abstract (PhD)',
    thesisUrl:
      'https://github.com/denzakh/rdd-late-life-thesis/blob/main/en/abstract/abstract.en.md',
    targetAudienceTitle: 'Target audience and the core problem solved',
    forDoctorsTitle: 'For clinicians and clinical researchers',
    forDoctorsText:
      'Eliminates the chaos of fragmented spreadsheets and paper charts: connects patient history, psychometric rating scales (HAM-D, MMSE), drug regimen switches, and longitudinal outcomes across all disease phases with instant cohort statistics.',
    forTechTitle: 'For hiring managers and tech leads',
    forTechText:
      'Showcases uncompromised engineering: TypeScript Single Source of Truth eliminating DB/validation/UI schema drift, optimistic CAS concurrency control, and zero-cold-start edge execution.',
    cardPassportTitle: 'Patient passport and history',
    cardPassportText:
      'Socio-demographic profile, family history, onset age, and somatic comorbidities with computed age at baseline inclusion.',
    cardMatrixTitle: 'Disease-phase matrix',
    cardMatrixText:
      'Unified tracking across retrospective episodes (1..N), current status (98), and catamnesis (99): symptoms, medication dosages, switch reasons, and clinical scales.',
    cardReportsTitle: 'Analytics and de-identification',
    cardReportsText:
      'Automated computation of intermission intervals, seasonality, and phase structure, plus de-identified dataset export (CSV, JSON, Excel) for publications.',
    cardDictionaryTitle: 'Self-documenting data dictionary',
    cardDictionaryText:
      'Live Data Dictionary generated directly from the field registry: doctors inspect clinical definitions, while engineers see types, validators, and SQLite columns.',
    techHighlightsTitle: 'Key engineering highlights',
    highlightRegistryTitle: 'Registry-Driven Core (SSOT)',
    highlightRegistryText:
      'One TypeScript registry generates the Cloudflare D1 (SQLite) schema, Zod validation schemas, form UI controls, and the Data Dictionary. The “field = column” invariant eliminates layer desynchronization.',
    highlightMatrixTitle: 'Virtualized grid with CAS',
    highlightMatrixText:
      'TanStack Virtual + CSS Grid with native sticky headers and columns without manual scroll sync. Compare-And-Swap (HTTP 409 Conflict) optimistic locking prevents silent clinical data overwrites.',
    highlightEdgeTitle: 'Serverless Edge stack and security',
    highlightEdgeText:
      'Next.js 16 on Cloudflare Workers + D1. Native Web Crypto API (PBKDF2-SHA256, 600k iterations), HttpOnly session cookies with SHA-256 tokens in D1, Row-Level Access (data_scope), and hash-chained audit logging.',
    diagramTitle: 'System context & container architecture (C4 Model)',
    diagramAlt: 'C4 overview: system context and containers of RDD',
    diagramSrc: '/diagrams/c4-overview.en.svg',
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
      'The registry data model is grounded in a 10-year longitudinal clinical study of recurrent depressive disorder in late-life patients conducted by the author at the V.M. Bekhterev National Medical Research Center for Psychiatry and Neurology (St. Petersburg, 2015, PhD in Psychiatry).',
    clinicalProblemTitle: 'What Clinical Problem Does It Solve?',
    clinicalProblemText:
      'In psychiatric research, traditional tooling (Excel spreadsheets, Google Forms, off-the-shelf EDC/CRMs like RedCap) rapidly fails: it cannot validate the temporal sequence of affective phases, fails to tie pharmacotherapy regimens to symptom dynamics, and allows conflicting entries. RDD encodes clinical reasoning into the system architecture: normalized patient passport, dynamic phase matrix (1..N, admission 98, catamnesis 99), automated pure-remission calculations, and psychometric rating scales (HAM-D, MMSE, Clock Drawing Test).',
    archSectionTitle: '2. Architecture: Registry-Driven Core (SSOT)',
    archRegistryText:
      'The central failure mode of clinical applications with dozens of diagnostic variables is schema drift between SQLite tables, server validation, UI form components, and documentation. RDD solves this with a Single Source of Truth:',
    archRegistryPoint1:
      'A single declarative TypeScript object (src/shared/config/registry/) defines each field: SQLite data type, UI component, min/max bounds, clinical options, and calculation formulas.',
    archRegistryPoint2:
      'From this registry, gen:d1 generates D1 SQL migrations, Zod schemas are derived at runtime (to-zod.ts), UI form cards render declaratively, and the Data Dictionary updates with zero manual effort.',
    archRegistryPoint3:
      'The “Field = Column” invariant: binary clinical signs are flat INTEGER 0/1 columns. This eliminates opaque JSON blobs and heavy EAV patterns, enabling direct high-throughput SQL aggregations.',
    matrixSectionTitle: '3. High-Performance Phase Grid (Matrix)',
    matrixText:
      'The phase matrix is the clinician’s primary workspace, rendering hundreds of dynamic clinical cells simultaneously:',
    matrixPoint1:
      'Zero-JS hybrid scrolling: rows render via CSS Grid where the left label column uses native position: sticky; left: 0. This completely avoids desynchronization of independent scroll containers.',
    matrixPoint2:
      'TanStack Virtual row windowing: only rows within the visible viewport are kept in the DOM, guaranteeing high performance even on massive patient charts.',
    matrixPoint3:
      'Fine-grained Zustand store: editing a cell re-renders only that specific DOM node via subscription selectors, leaving the rest of the table untouched.',
    matrixPoint4:
      'Compare-And-Swap (CAS) data protection: concurrent edits by clinicians are verified against the record version. On collision (HTTP 409 Conflict), the doctor sees an interactive diff of both values — silent overwrites are impossible by design.',
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
    thesisLink: 'PhD Thesis Abstract (Bekhterev Institute)',
    thesisUrl:
      'https://github.com/denzakh/rdd-late-life-thesis/blob/main/en/abstract/abstract.en.md',
    docsLink: 'Architecture Overview (GitHub)',
    docsUrl: 'https://github.com/denzakh/rdd/blob/main/docs/en/architecture-overview.md',
    backHome: '← Back to Home',
    openDemo: 'Open Demo Interface',
  },
  homeHub: {
    title: 'Working hub',
    greeting: 'Signed in as',
    searchPlaceholder: 'Patient #',
    search: 'Search',
    cardPatientsTitle: 'Patients',
    cardPatientsText:
      'Patient list and cards: search by number, the passport, a jump into the phase matrix.',
    cardReportsTitle: 'Reports',
    cardReportsText: 'Cohort aggregates and de-identified export as csv / json / xlsx.',
    cardDictionaryTitle: 'Data Dictionary',
    cardDictionaryText:
      'The Data Dictionary is auto-generated from the field registry and stays in sync with the D1 schema.',
    cardDocsTitle: 'Documentation',
    cardDocsText:
      'Curated digests: architecture, security, NFR/RTO/RPO, roadmap. Full texts live on GitHub.',
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
