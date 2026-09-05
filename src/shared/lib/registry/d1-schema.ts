import { FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'

/**
 * Маппинг доменных типов реестра в типы SQLite (Cloudflare D1).
 * BOOLEAN -> INTEGER (0/1), DATE -> TEXT (ISO-8601) — стандарт SQLite.
 */
const DB_TYPE_TO_SQL: Record<NonNullable<RegistryField['db_type']>, string> = {
  INTEGER: 'INTEGER',
  FLOAT: 'REAL',
  BOOLEAN: 'INTEGER',
  TEXT: 'TEXT',
  DATE: 'TEXT',
}

/** Системные колонки таблицы patients. */
const PATIENT_SYSTEM_COLUMNS = [`"id" INTEGER PRIMARY KEY AUTOINCREMENT`] as const

/**
 * Системные колонки таблицы phases:
 *  - id — первичный ключ;
 *  - patient_id — внешний ключ к patients (ON DELETE CASCADE);
 *  - phase_order_id — порядковый номер фазы в рамках пациента (array_index + 1).
 */
const PHASE_SYSTEM_COLUMNS = [
  `"id" INTEGER PRIMARY KEY AUTOINCREMENT`,
  `"patient_id" INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE`,
  `"phase_order_id" INTEGER NOT NULL`,
] as const

export interface ColumnDef {
  /** Имя колонки (snake_case, совпадает с id поля из реестра). */
  name: string
  /** SQL-тип. */
  sqlType: string
  /** Fallback-комментарий к колонке. */
  readonly comment?: string
}

/**
 * Выгрузка полей реестра в колонки БД.
 * Поля с `calculate` (вычисляемые) в БД не хранятся — считаются на лету.
 * Поля без явного `db_type` (тоже вычисляемые/id) пропускаются.
 *
 * @param onlyPatient false — фаза и все секции-характеристики фазы
 *   (remission/status/therapy/scales — их scope не задан и трактуется как `phase`).
 */
const toColumns = (onlyPatient: boolean): ColumnDef[] => {
  const columns: ColumnDef[] = []

  Object.values(FLAT_REGISTRY).forEach((raw) => {
    const field = raw as RegistryField

    // pbijanie по scope: только явно 'patient' -> в patients; прочее -> в phases
    const isPatientField = field.scope === 'patient'
    if (isPatientField !== onlyPatient) return

    // Вычисляемые поля и поля без db_type не имеют колонки в БД
    if (field.calculate || !field.db_type) return

    columns.push({
      name: field.id,
      sqlType: DB_TYPE_TO_SQL[field.db_type],
      comment: typeof field.label === 'string' ? field.label : field.label.ru,
    })
  })

  return columns
}

/** Колонки таблицы patients (данные пациента). */
const patientColumns = (): ColumnDef[] => toColumns(true)

/** Колонки таблицы phases (атрибуты фазы + статус/терапия/шкалы/ремиссия). */
const phaseColumns = (): ColumnDef[] => toColumns(false)

/**
 * Формирование корректного CREATE TABLE: системные колонки + доменные колонки
 * + завершающий constraint. Каждая колонка отделяется запятой на своей строке.
 */
const createTable = (
  tableName: string,
  system: readonly string[],
  columns: ColumnDef[],
  suffix: string
): string => {
  const rows: string[] = [
    ...system,
    ...columns.map((c) => `"${c.name}" ${c.sqlType} NULL`),
  ]

  // Запятая после каждой колонки — табличные constraint's (UNIQUE/CHECK)
  // следуют после последней запятой на отдельной строке, без неё.
  return [
    `CREATE TABLE ${tableName} (`,
    ...rows.map((r) => `    ${r},`),
    `    ${suffix}`,
    `);`,
  ].join('\n')
}

/**
 * Генерация полного DDL для Cloudflare D1 из реестра полей (single source of truth).
 * Возвращает SQL-текст первой (полной) миграции.
 */
export const generateD1Schema = (): string => {
  const patients = createTable(
    'patients',
    PATIENT_SYSTEM_COLUMNS,
    patientColumns(),
    // Пациент идентифицируется первичным ключом id; уникальных бизнес-полей
    // пока не задано (birth_year уникальным быть не может).
    `CHECK ("birth_year" >= 1900)`
  )
  const phases = createTable(
    'phases',
    PHASE_SYSTEM_COLUMNS,
    phaseColumns(),
    `UNIQUE ("patient_id", "phase_order_id")`
  )

  return [
    `-- Авто-генерация D1-схемы из src/shared/config/registry (единый источник правды).`,
    `-- Не редактировать вручную: правьте реестр и запустите "npm run gen:d1".`,
    ``,
    patients,
    ``,
    phases,
    ``,
  ].join('\n')
}