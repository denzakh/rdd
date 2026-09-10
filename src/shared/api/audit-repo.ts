/**
 * Запись журнала аудита (migrations/0002_audit.sql, 0006_audit_hash_chain.sql,
 * docs/matrix.md §6.6). Значения сериализуются в JSON-строки — TEXT-колонка
 * принимает все варианты FieldValue.
 *
 * Целостность (hash-chain, docs/threat-model.md §2 R): каждая запись содержит
 * prev_hash = entry_hash предыдущей записи (SHA-256 от канонического payload,
 * включающего содержимое записи) и собственный entry_hash. Подмена/удаление
 * любой записи ломает цепочку и детектируется verifyChain(). Доверенный
 * оператор с прямым доступом к D1 может пересчитать цепочку целиком, но не
 * может этого сделать незаметно и не может UPDATE/DELETE вовсе — на уровне
 * БД стоят триггеры (миграция 0006_audit_hash_chain.sql).
 */
export interface AuditEntry {
  actorId?: string
  patientId: number
  phaseId?: number
  fieldId: string
  /** Стандартные значения: 'update' | 'conflict_resolved' | 'phase_created' | 'phase_deleted'; admin-события — 'user:<action>' и т.п. */
  action: string
  resolution?: 'mine' | 'theirs'
  oldValue?: unknown
  newValue?: unknown
  overwrittenVersion?: string
  baseVersion?: string
}

export interface ChainVerification {
  valid: boolean
  /** Сколько записей в цепочке проверено. */
  checked: number
  /** Записей до миграции 0006 (без entry_hash — не в цепочке). */
  legacy: number
  /** id первой записи, где цепочка сломана (если valid=false). */
  brokenAtId: number | null
}

export interface AuditRepository {
  /**
   * Батчевая вставка (используется вместе с db.batch при записи фазы).
   * Асинхронная: берёт последний entry_hash из БД и достраивает цепочку
   * локально внутри батча (атомарно с данными).
   */
  insertStatements(entries: AuditEntry[]): Promise<D1PreparedStatement[]>
  insert(entry: AuditEntry): Promise<void>
  listByPhase(phaseId: number, limit?: number): Promise<Record<string, unknown>[]>
  listByPatient(patientId: number, limit?: number): Promise<Record<string, unknown>[]>
  /**
   * Проверка целостности hash-chain по всем записям (ORDER BY id).
   * Записи до миграции 0006 (entry_hash IS NULL) считаются legacy: они не
   * проверяются, но служат основанием цепочки для последующих записей.
   */
  verifyChain(): Promise<ChainVerification>
}

const INSERT_SQL = `
  INSERT INTO audit_log
    (actor_id, patient_id, phase_id, field_id, action, resolution,
     old_value, new_value, overwritten_version, base_version, prev_hash, entry_hash)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

const encoder = new TextEncoder()

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Канонический payload записи: prev_hash + все значимые поля. */
function canonicalPayload(
  prevHash: string | null,
  entry: AuditEntry,
  oldValue: string | null,
  newValue: string | null
): string {
  return JSON.stringify([
    prevHash,
    entry.actorId ?? null,
    entry.patientId,
    entry.phaseId ?? null,
    entry.fieldId,
    entry.action,
    entry.resolution ?? null,
    oldValue,
    newValue,
    entry.overwrittenVersion ?? null,
    entry.baseVersion ?? null,
  ])
}

/** Payload записи, уже лежащей в БД (old/new_value — уже JSON-строки). */
function canonicalPayloadRow(prevHash: string | null, row: Record<string, unknown>): string {
  return canonicalPayload(
    prevHash,
    {
      actorId: (row.actor_id as string | null) ?? undefined,
      patientId: row.patient_id as number,
      phaseId: (row.phase_id as number | null) ?? undefined,
      fieldId: row.field_id as string,
      action: row.action as string,
      resolution: (row.resolution as AuditEntry['resolution'] | null) ?? undefined,
      overwrittenVersion: (row.overwritten_version as string | null) ?? undefined,
      baseVersion: (row.base_version as string | null) ?? undefined,
    },
    (row.old_value as string | null) ?? null,
    (row.new_value as string | null) ?? null
  )
}

/**
 * Последний хэш цепочки. Для пустой БД — null (genesis); для legacy-записей —
 * хэш последней строки, вычисленный на лету (цепочка непрерывна через миграцию).
 */
async function lastChainHash(db: D1Database): Promise<string | null> {
  const row = await db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 1').first()
  if (!row) return null
  return (
    (row.entry_hash as string | null) ??
    sha256Hex(canonicalPayloadRow(row.prev_hash as string | null, row))
  )
}

export function createAuditRepository(db: D1Database): AuditRepository {
  return {
    async insertStatements(entries) {
      let prevHash = await lastChainHash(db)
      const statements: D1PreparedStatement[] = []
      for (const e of entries) {
        const entryHash = await sha256Hex(
          canonicalPayload(
            prevHash,
            e,
            e.oldValue === undefined ? null : JSON.stringify(e.oldValue),
            e.newValue === undefined ? null : JSON.stringify(e.newValue)
          )
        )
        statements.push(
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
              e.baseVersion ?? null,
              prevHash,
              entryHash
            )
        )
        prevHash = entryHash
      }
      return statements
    },

    async insert(entry) {
      const [stmt] = await this.insertStatements([entry])
      await stmt.run()
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

    async verifyChain() {
      const { results } = await db.prepare('SELECT * FROM audit_log ORDER BY id').all()
      let prevRecomputed: string | null = null
      let legacy = 0
      let checked = 0
      for (const row of results as Record<string, unknown>[]) {
        const recomputed = await sha256Hex(canonicalPayloadRow(row.prev_hash as string | null, row))
        // prev_hash каждой записи = recomputed-хэш предыдущей; genesis — NULL.
        const first = checked + legacy === 0
        const prevOk = first ? row.prev_hash === null : row.prev_hash === prevRecomputed
        if (row.entry_hash === null) {
          legacy++
        } else {
          checked++
          if (!prevOk || row.entry_hash !== recomputed) {
            return { valid: false, checked, legacy, brokenAtId: row.id as number }
          }
        }
        prevRecomputed = recomputed
      }
      return { valid: true, checked, legacy, brokenAtId: null }
    },
  }
}
