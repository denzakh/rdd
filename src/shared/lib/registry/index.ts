export {
  TABLE_IDS,
  buildDesiredTables,
  computeDelta,
  generateD1Schema,
  REGISTRY_CURRENT_VERSION,
  REGISTRY_VERSION_COLUMNS,
  REGISTRY_VERSIONS_DDL,
  REGISTRY_VERSIONS_SEED,
  renderDeltaSql,
  renderOpSql,
  type DbType,
  type ExoticOp,
  type SchemaOp,
  type SchemaSnapshot,
  type TableColumn,
  type TableId,
  type TargetDb,
} from './d1-schema'
export { generateSchema, phaseSchema } from './to-zod'
export {
  buildDataDictionary,
  type DictionaryEntry,
  type DictionarySection,
} from './data-dictionary'
export {
  breakingChanges,
  fieldSnapshot,
  findUntrackedBreakingChanges,
  isBreakingTracked,
  snapshotFromRegistry,
  type BreakingKind,
  type FieldEvolutionSnapshot,
  type RegistryEvolutionSnapshot,
  type UntrackedFieldChange,
} from './evolution-guard'
