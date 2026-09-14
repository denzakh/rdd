export {
  createPatientRepository,
  patientScopeFor,
  PATIENT_SCOPE_ALL,
  CONSENT_CURRENT_VERSION,
  type PatientRepository,
  type PatientInput,
  type PatientScope,
  type ConsentInput,
} from './api/patient-repo'
export {
  averageAgeAtInclusion,
  familyHistoryDistribution,
  genderDistribution,
  type ValueCount,
} from './api/patient-queries'
export { PatientsTable } from './ui/patients-table'
export { PatientCard } from './ui/patient-card'
