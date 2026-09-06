/**
 * Запись журнала аудита (migrations/0002_audit.sql, docs/matrix.md §6.6).
 * Значения сериализуются в JSON-строки — TEXT-колонка принимает все
 * варианты FieldValue.
 */
export interface AuditEntry {
  actorId?: string
  patientId: number
  phaseId?: number
  fieldId: string
  action: 'update' | 'conflict_resolved' | 'phase_created' | 'phase_deleted'
  resolution?: 'mine' | 'theirs'
  oldValue?: unknown
  newValue?: unknown
  overwrittenVersion?: string
  baseVersion?: string
}

export interface AuditRepository {
  /** Батчевая вставка (используется вместе с db.batch при записи фазы). */
  insertStatements(entries: AuditEntry[]): D1PreparedStatement[]
  insert(entry: AuditEntry): Promise<void>
  listByPhase(phaseId: number, limit?: number): Promise<Record<string, unknown>[]>
  listByPatient(patientId: number, limit?: number): Promise<Record<string, unknown>[]>
}

const INSERT_SQL = `
  INSERT INTO audit_log
    (actor_id, patient_id, phase_id, field_id, action, resolution,
     old_value, new_value, overwritten_version, base_version)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

export function createAuditRepository(db: D1Database): AuditRepository {
  const toStatement = (e: AuditEntry) =>
    db
      .prepare(INSERT_SQL)
      .bind(
        e.actorId ?? null,
        e.patientId,
        e.phaseId ?? null,
        e.fieldId,
        e.action,
        e.resolution ?? null,
        e.oldValue === undefined ? null : JSON.stringify(e.oldValue),
        e.newValue === undefined ? null : JSON.stringify(e.newValue),
        e.overwrittenVersion ?? null,
        e.baseVersion ?? null
      )

  return {
    insertStatements: (entries) => entries.map(toStatement),

    async insert(entry) {
      await toStatement(entry).run()
    },

    async listByPhase(phaseId, limit = 200) {
      const { results } = await db
        .prepare('SELECT * FROM audit_log WHERE phase_id = ? ORDER BY ts DESC LIMIT ?')
        .bind(phaseId, limit)
        .all()
      return results
    },

    async listByPatient(patientId, limit = 500) {
      const { results } = await db
        .prepare('SELECT * FROM audit_log WHERE patient_id = ? ORDER BY ts DESC LIMIT ?')
        .bind(patientId, limit)
        .all()
      return results
    },
  }
}
