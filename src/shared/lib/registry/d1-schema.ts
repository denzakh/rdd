import { FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'

export type TargetDb = 'sqlite' | 'postgres'
export type DbType = NonNullable<RegistryField['db_type']>
export type TableId = 'patients' | 'phases'

export const TABLE_IDS = ['patients', 'phases'] as const

/** Хранимая колонка: только имя и логический тип (для сопоставления/diff). */
export interface TableColumn {
  name: string
  sqlType: string
}

/** Снапшот применённой схемы (что физически есть в проде). */
export interface SchemaSnapshot {
  version: number
  tables: Record<TableId, TableColumn[]>
}

/**
 * Маппинг доменных типов реестра в типы целевой БД.
 * BOOLEAN -> 0/1 INTEGER, DATE -> TEXT (ISO-8601) — стандарт SQLite/D1.
 */
export const DB_TYPE_TO_SQL: Record<DbType, string> = {
  INTEGER: 'INTEGER',
  FLOAT: 'REAL',
  BOOLEAN: 'INTEGER',
  TEXT: 'TEXT',
  DATE: 'TEXT',
}

/** Системные колонки (стабильны, в diff не порождают операций). */
const PATIENT_SYSTEM_COLUMNS: TableColumn[] = [{ name: 'id', sqlType: 'INTEGER' }]
const PHASE_SYSTEM_COLUMNS: TableColumn[] = [
  { name: 'id', sqlType: 'INTEGER' },
  { name: 'patient_id', sqlType: 'INTEGER' },
  { name: 'phase_order_id', sqlType: 'INTEGER' },
]

/** Метаданные таблиц: системные колонки + завершающий constraint. */
const TABLE_META: Record<TableId, { sys: TableColumn[]; suffix: string }> = {
  patients: {
    sys: PATIENT_SYSTEM_COLUMNS,
    suffix: `CHECK ("birth_year" >= 1900)`,
  },
  phases: {
    sys: PHASE_SYSTEM_COLUMNS,
    suffix: `UNIQUE ("patient_id", "phase_order_id")`,
  },
}
/**
 * Выгрузка полей реестра в колонки одной таблицы (системные + доменные).
 * Поля с `calculate` или без `db_type` — вычисляемые, колонок не имеют.
 */
const toColumns = (table: TableId): TableColumn[] => {
  const onlyPatient = table === 'patients'
  const columns: TableColumn[] = [...TABLE_META[table].sys]

  Object.values(FLAT_REGISTRY).forEach((raw) => {
    const field = raw as RegistryField
    const isPatientField = field.scope === 'patient'
    if (isPatientField !== onlyPatient) return
    if (field.calculate || !field.db_type) return

    columns.push({ name: field.id, sqlType: DB_TYPE_TO_SQL[field.db_type] })
  })

  return columns
}

/** Желаемые таблицы (полная картина из реестра). */
export const buildDesiredTables = (): Record<TableId, TableColumn[]> => ({
  patients: toColumns('patients'),
  phases: toColumns('phases'),
})

const EXTRA: Record<TableId, Record<string, string>> = {
  patients: { id: 'INTEGER PRIMARY KEY AUTOINCREMENT' },
  phases: {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    patient_id: 'INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE',
    phase_order_id: 'INTEGER NOT NULL',
  },
}

/** Формирование полного DDL (baseline) из желаемой схемы. */
const createTable = (table: TableId, columns: TableColumn[]): string => {
  const meta = TABLE_META[table]
  const sysNames = new Set(meta.sys.map((c) => c.name))
  const domain = columns.filter((c) => !sysNames.has(c.name))
  const extra = EXTRA[table]

  const sysRows = meta.sys.map((c) => `"${c.name}" ${extra[c.name]}`)
  const rows: string[] = [...sysRows, ...domain.map((c) => `"${c.name}" ${c.sqlType} NULL`)]

  return [
    `CREATE TABLE ${table} (`,
    ...rows.map((r) => `    ${r},`),
    `    ${meta.suffix}`,
    `);`,
  ].join('\n')
}

/** Генерация полного DDL (baseline) для нового окружения / референса. */
/* ------------------------------------------------------------------ */
/*  Diff-машина: дельта между желаемой схемой и снапшотом              */
/* ------------------------------------------------------------------ */

/** Безопасная операция, выполняемая автоматически. */
export type SchemaOp =
  | { kind: 'add'; table: TableId; column: TableColumn }
  | { kind: 'rename'; table: TableId; from: string; to: string; sqlType: string }

/** Экзотическая операция — требует abort и ручного вмешательства. */
export type ExoticOp =
  | {
      kind: 'type-change'
      table: TableId
      column: string
      from: string
      to: string
    }
  | { kind: 'drop'; table: TableId; column: string; sqlType: string }
  | { kind: 'moved'; from: TableId; to: TableId; column: string; sqlType: string }

export interface DeltaResult {
  ops: SchemaOp[]
  exotic: ExoticOp[]
}

interface Leftover {
  table: TableId
  col: TableColumn
  consumed: boolean
}

/**
 * Дельта между желаемой схемой (Registry) и снапшотом (факт в проде).
 * Автоматически генерируются только ADD COLUMN и RENAME COLUMN.
 * Детектируется экзотика: смена типа, удаление, перенос между таблицами,
 * а также неоднозначные наборы (когда нельзя достоверно различить rename/add/drop).
 */
export const computeDelta = (
  desired: Record<TableId, TableColumn[]>,
  snapshot: SchemaSnapshot | null
): DeltaResult => {
  const ops: SchemaOp[] = []
  const exotic: ExoticOp[] = []

  if (!snapshot) {
    return { ops, exotic }
  }

  const leftoverRemoved: Leftover[] = []
  const leftoverAdded: Leftover[] = []

  TABLE_IDS.forEach((tableId) => {
    const target = desired[tableId]
    const snap = snapshot.tables[tableId] ?? []

    const tByName = new Map(target.map((c) => [c.name, c]))
    const sByName = new Map(snap.map((c) => [c.name, c]))

    const removed: TableColumn[] = []
    const added: TableColumn[] = []

    // 1) Проход по снапшоту: type-change / отсутствие имени в цели
    for (const col of snap) {
      const t = tByName.get(col.name)
      if (!t) {
        removed.push(col)
      } else if (t.sqlType !== col.sqlType) {
        exotic.push({
          kind: 'type-change',
          table: tableId,
          column: col.name,
          from: col.sqlType,
          to: t.sqlType,
        })
      }
    }

    // 2) Проход по цели: колонки, отсутствующие в снапшоте
    for (const col of target) {
      if (!sByName.has(col.name)) {
        added.push(col)
      }
    }

    // 3) Достоверный RENAME — только когда наборы чистые:
    //    одинаковое число удалений и добавлений, типы попарно совпадают.
    if (
      removed.length > 0 &&
      removed.length === added.length &&
      removed.every((r, i) => r.sqlType === added[i].sqlType)
    ) {
      removed.forEach((r, i) => {
        ops.push({
          kind: 'rename',
          table: tableId,
          from: r.name,
          to: added[i].name,
          sqlType: r.sqlType,
        })
      })
      return
    }

    // 4) Иначе — складируем для глобальной классификации
    removed.forEach((c) => leftoverRemoved.push({ table: tableId, col: c, consumed: false }))
    added.forEach((c) => leftoverAdded.push({ table: tableId, col: c, consumed: false }))
  })

  // 5) Экзотика: перенос колонки между таблицами
  for (const r of leftoverRemoved) {
    if (r.consumed) continue
    const targetAdded = leftoverAdded.find(
      (a) =>
        !a.consumed &&
        a.table !== r.table &&
        a.col.name === r.col.name &&
        a.col.sqlType === r.col.sqlType
    )
    if (targetAdded) {
      exotic.push({
        kind: 'moved',
        from: r.table,
        to: targetAdded.table,
        column: r.col.name,
        sqlType: r.col.sqlType,
      })
      r.consumed = true
      targetAdded.consumed = true
    }
  }

  // 6) Оставшиеся удалённые — DROP (экзотика)
  for (const r of leftoverRemoved) {
    if (r.consumed) continue
    exotic.push({
      kind: 'drop',
      table: r.table,
      column: r.col.name,
      sqlType: r.col.sqlType,
    })
    r.consumed = true
  }

  // 7) Оставшиеся добавленные — ADD COLUMN (безопасно)
  for (const a of leftoverAdded) {
    if (a.consumed) continue
    ops.push({ kind: 'add', table: a.table, column: a.col })
    a.consumed = true
  }

  return { ops, exotic }
}

/** Рендер одной безопасной операции в SQL-выражение D1. */
export const renderOpSql = (op: SchemaOp): string => {
  switch (op.kind) {
    case 'add':
      return `ALTER TABLE ${op.table} ADD COLUMN "${op.column.name}" ${op.column.sqlType} NULL;`
    case 'rename':
      return `ALTER TABLE ${op.table} RENAME COLUMN "${op.from}" TO "${op.to}";`
  }
}

/** Рендер всей SQL-дельты (заголовок + операции). */
export const renderDeltaSql = (ops: SchemaOp[]): string => {
  if (ops.length === 0) return ''
  return [
    `-- Авто-генерация дельты D1 из diff реестра и снапшота.`,
    `-- Не редактировать вручную: правьте реестр и запустите "npm run gen:d1".`,
    ``,
    ...ops.map(renderOpSql),
    ``,
  ].join('\n')
}
export const generateD1Schema = (desired = buildDesiredTables()): string => {
  return [
    `-- Авто-генерация D1-схемы из src/shared/config/registry (единый источник правды).`,
    `-- Не редактировать вручную: правьте реестр и запустите "npm run gen:d1".`,
    ``,
    createTable('patients', desired.patients),
    ``,
    createTable('phases', desired.phases),
    ``,
  ].join('\n')
}
