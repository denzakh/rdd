'use server'

/**
 * Server Action экспорта де-идентифицированного датасета (docs/export.md).
 * Де-идентификация — в getDeidentifiedDataset (queries.ts), один раз,
 * до сериализации. Здесь — только auth/scope + тонкий выбор адаптера.
 */
import { requireUser } from '@/shared/api'
import { getDb } from '@/shared/api'
import { patientScopeFor } from '@/entities/patient'
import { getDeidentifiedDataset, K_ANONYMITY_K } from '@/entities/phase'
import { toCsv, toJson, toXlsx, exportFileMeta } from '@/shared/lib/export'
import { createAuditRepository } from '@/shared/api'

export type ExportFormat = 'csv' | 'json' | 'xlsx'

export interface ExportResult {
  format: ExportFormat
  mime: string
  filename: string
  /** Base64 тела файла (Server Action не может вернуть Response). */
  base64: string
  patients: number
  rowsTotal: number
  rowsExported: number
  suppressedRows: number
  k: number
}

const toBase64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64')

/**
 * Экспорт де-идентифицированного датасета для R/Python (без UI-аналитики).
 * Доступен admin/clinician/readonly (только чтение своих scope-данных).
 */
export async function exportDeidentified(format: ExportFormat): Promise<ExportResult> {
  if (format !== 'csv' && format !== 'json' && format !== 'xlsx') {
    throw new Error(`Неизвестный формат экспорта: ${String(format)}`)
  }
  const user = await requireUser()
  const db = await getDb()
  const scope = patientScopeFor(user)
  const dataset = await getDeidentifiedDataset(db, scope, K_ANONYMITY_K)

  let bytes: Uint8Array
  if (format === 'json') bytes = new TextEncoder().encode(toJson(dataset))
  else if (format === 'xlsx') bytes = toXlsx(dataset)
  else bytes = new TextEncoder().encode(toCsv(dataset))

  const { mime, filename } = exportFileMeta(format)
  await createAuditRepository(db).insert({
    actorId: user.id,
    patientId: 0,
    fieldId: 'export:deidentified',
    action: 'update',
    newValue: { format, rowsExported: dataset.meta.rowsExported, k: dataset.meta.k },
  })

  return {
    format,
    mime,
    filename,
    base64: toBase64(bytes),
    patients: dataset.meta.patients,
    rowsTotal: dataset.meta.rowsTotal,
    rowsExported: dataset.meta.rowsExported,
    suppressedRows: dataset.meta.suppressedRows,
    k: dataset.meta.k,
  }
}
