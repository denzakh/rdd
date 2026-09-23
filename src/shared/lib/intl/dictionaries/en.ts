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
      'Clinical registry web app: patient passport, disease-phase matrix, roles, audit and authentication.',
    domainNote:
      'The data model is grounded in real research — a longitudinal study of recurrent depressive disorder in late-life patients.',
    login: 'Sign in',
    about: 'About',
    docs: 'Docs on GitHub',
    docsUrl: 'https://github.com/denzakh/rdd/blob/main/docs/en/architecture-overview.md',
    thesis: 'Thesis abstract',
    thesisUrl:
      'https://github.com/denzakh/rdd-late-life-thesis/blob/main/en/abstract/abstract.en.md',
    cardPassportTitle: 'Patient passport',
    cardPassportText:
      'Demographics, social status, computed age — the passport part of the registry.',
    cardMatrixTitle: 'Phase matrix 1..N + 98/99',
    cardMatrixText:
      'History and current phases: pharmacotherapy, remission, mental status, rating scales.',
    cardReportsTitle: 'Reports and export',
    cardReportsText: 'Cohort aggregates and de-identified export as csv / json / xlsx.',
    cardDictionaryTitle: 'Registry-driven dictionary',
    cardDictionaryText: 'The Data Dictionary is auto-generated from the single TS field registry.',
    pipelineTitle: 'Registry → D1 / Zod / UI',
    pipeline1:
      'One TS field registry is the source of truth for the D1 schema, Zod validation and UI.',
    pipeline2: '“Field = column”: the invariant every layer is built on.',
    pipeline3: 'Schema evolves only via DB reset; protocol versioning lives in the baseline.',
    boundariesTitle: 'Demo boundaries',
    boundariesText:
      'Regulation, backup/DR, retention, medical validation and collab-sync are deliberately out of scope: this is an architecture showcase, not a production system for real patients.',
    diagramAlt: 'C4 overview: system context and containers of RDD',
    diagramSrc: '/diagrams/c4-overview.en.svg',
    footerNote: 'Demo: synthetic data only, no real PII',
  },
  about: {
    title: 'About the project',
    intro:
      'RDD is a clinical registry for depressive disorders and a Senior/Architect-level engineering showcase: registry-driven core, phase matrix with CAS conflicts and virtualization, own sessions and audit on Cloudflare D1.',
    registryTitle: 'Registry-driven core',
    registryText:
      'One TS registry generates the D1 schema, Zod schemas, UI rendering, the matrix and computed fields. Details — rdd-v1.md on GitHub.',
    casTitle: 'CAS conflicts without data loss',
    casText:
      'Concurrent edits are detected by record version: a conflict returns as 409, the clinician’s data is never silently overwritten. Details — matrix.md on GitHub.',
    virtualizationTitle: 'Matrix virtualization',
    virtualizationText:
      'A phase grid of hundreds of cells renders through a visibility window: the DOM keeps only visible rows. Details — matrix.md on GitHub.',
    securityTitle: 'Security in one line',
    securityText:
      'Own D1 sessions, roles and row-level access, audit in one batch with the write, no public signup — accounts are created by admin only. Details live on GitHub only, never in runtime HTML.',
    boundariesTitle: 'Demo boundaries',
    boundariesText:
      'Regulation, encryption at rest and environment separation, backup/DR, retention and data deletion, medical validation, collab-sync — deliberately out of scope. Escalation thresholds are fixed in the specs.',
    thesisLink: 'Thesis abstract (PhD, Bekhterev Institute, 2015)',
    thesisUrl:
      'https://github.com/denzakh/rdd-late-life-thesis/blob/main/en/abstract/abstract.en.md',
    docsLink: 'Full documentation on GitHub',
    docsUrl: 'https://github.com/denzakh/rdd/blob/main/docs/en/architecture-overview.md',
    backHome: '← Back home',
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
