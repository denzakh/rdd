/**
 * Хелпер интеграционных тестов (docs/spec-stage-4.md §3):
 * локальная D1 через getPlatformProxy (тот же механизм, что у opennext
 * и scripts/test-db.ts). Миграции накатываются до тестов командой
 * `tsx scripts/ensure-local-db.ts` (часть npm run test:db / test:integration).
 */
import { getPlatformProxy } from 'wrangler'

let cached: { env: CloudflareEnv; dispose: () => Promise<void> } | null = null

/** Ленивый синглтон env с привязкой DB (локальное состояние .wrangler/state). */
export async function getTestDb(): Promise<D1Database> {
  if (!cached) {
    cached = await getPlatformProxy<CloudflareEnv>({ configPath: 'wrangler.jsonc' })
  }
  return cached.env.DB
}

/** Закрыть прокси после всех тестов (afterAll). */
export async function disposeTestDb(): Promise<void> {
  if (cached) {
    await cached.dispose()
    cached = null
  }
}

/** Удалить пациента вместе с его фазами (фазы не каскадятся — чистим руками). */
export async function cleanupPatient(db: D1Database, patientId: number): Promise<void> {
  await db.prepare('DELETE FROM phases WHERE patient_id = ?').bind(patientId).run()
  await db.prepare('DELETE FROM patients WHERE id = ?').bind(patientId).run()
}
