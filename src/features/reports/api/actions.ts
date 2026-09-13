'use server'

/**
 * Server Action экспорта де-идентифицированного датасета (docs/export.md).
 * Де-идентификация — в getDeidentifiedDataset (queries.ts), один раз,
 * до сериализации. Здесь — только auth/scope + троттлинг + тонкий выбор адаптера.
 */
import { requireUser } from '@/shared/api'
import { getDb } from '@/shared/api'
import { EXPORT_THROTTLE_SECONDS, tryClaimExportSlot } from '@/shared/api'
import { patientScopeFor } from '@/entities/patient'
import { getDeidentifiedDataset } from '@/entities/phase'
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
}

const toBase64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64')

/**
 * Экспорт де-идентифицированного датасета для R/Python (без UI-аналитики).
 * Доступен admin/clinician/readonly (только чтение своих scope-данных).
 * Троттлинг: 1 экспорт / EXPORT_THROTTLE_SECONDS на пользователя
 * (docs/export.md §2) — самая дорогая операция, флуд бьёт по D1.
 */
export async function exportDeidentified(format: ExportFormat): Promise<ExportResult> {
  if (format !== 'csv' && format !== 'json' && format !== 'xlsx') {
    throw new Error(`Неизвестный формат экспорта: ${String(format)}`)
  }
  const user = await requireUser()
  const db = await getDb()
  const slot = await tryClaimExportSlot(db, user.id)
  if (!slot.allowed) {
    throw new Error(
      `Экспорт временно недоступен: повторите через ${slot.retryAfterSeconds} с ` +
        `(лимит — 1 экспорт в ${EXPORT_THROTTLE_SECONDS} с на пользователя)`
    )
  }
  const scope = patientScopeFor(user)
  const dataset = await getDeidentifiedDataset(db, scope)

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
    newValue: { format, rows: dataset.meta.rowsTotal },
  })

  return {
    format,
    mime,
    filename,
    base64: toBase64(bytes),
    patients: dataset.meta.patients,
    rowsTotal: dataset.meta.rowsTotal,
  }
}
