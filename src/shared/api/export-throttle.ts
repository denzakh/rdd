/**
 * Троттлинг экспорта (docs/ru/export.md §2, миграция 0007_export_throttle.sql).
 *
 * exportDeidentified — самый дорогой Server Action (полная выборка
 * patients+phases, де-идентификация в памяти): флуд им бьёт
 * по D1 сильнее обычного CRUD. Минимальная защита: 1 экспорт / 60 с
 * на пользователя (users.last_export_at, ISO).
 *
 * Это НЕ часть login rate-limit (failed_attempts/locked_until в session-repo):
 * флуд экспорта не должен блокировать вход, а перебор пароля — экспорт.
 * Поэтому отдельная колонка и отдельный модуль.
 *
 * Только server-окружение (getDb() → Cloudflare binding).
 */

/** Окно троттлинга: 1 экспорт в N секунд на пользователя. */
export const EXPORT_THROTTLE_SECONDS = 60

export interface ExportSlot {
  allowed: boolean
  /** Сколько секунд ждать перед следующей попыткой (0 при allowed). */
  retryAfterSeconds: number
}

const toMs = (iso: string | null): number | null => {
  if (!iso) return null
  const ms = new Date(iso).getTime()
  return Number.isNaN(ms) ? null : ms
}

/**
 * Атомарно занимает слот экспорта пользователя.
 * UPDATE условный: слот занимается только если last_export_at пуст или
 * старше окна — параллельные запросы не проходят оба (D1: один UPDATE
 * выигрывает, второй видит changes = 0).
 *
 * @param now — для тестов (подмена времени); в проде — текущее время.
 */
export async function tryClaimExportSlot(
  db: D1Database,
  userId: string,
  now: Date = new Date()
): Promise<ExportSlot> {
  const nowIso = now.toISOString()
  const thresholdIso = new Date(now.getTime() - EXPORT_THROTTLE_SECONDS * 1000).toISOString()

  const claimed = await db
    .prepare(
      `UPDATE users SET last_export_at = ?, updated_at = ?
       WHERE id = ? AND (last_export_at IS NULL OR last_export_at <= ?)`
    )
    .bind(nowIso, nowIso, userId, thresholdIso)
    .run()

  if (claimed.meta.changes > 0) return { allowed: true, retryAfterSeconds: 0 }

  // Слот занят — считаем остаток по фактической метке (не по threshold).
  const row = await db
    .prepare('SELECT last_export_at FROM users WHERE id = ?')
    .bind(userId)
    .first<{ last_export_at: string | null }>()
  const lastMs = toMs(row?.last_export_at ?? null)
  if (lastMs === null) {
    // Пользователя нет или битая метка — не блокируем вход в заблуждение,
    // но и слот не выдаём: fail closed с минимальной задержкой.
    return { allowed: false, retryAfterSeconds: EXPORT_THROTTLE_SECONDS }
  }
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((lastMs + EXPORT_THROTTLE_SECONDS * 1000 - now.getTime()) / 1000)
  )
  return { allowed: false, retryAfterSeconds }
}
