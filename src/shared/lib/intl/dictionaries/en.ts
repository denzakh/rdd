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
} as const
