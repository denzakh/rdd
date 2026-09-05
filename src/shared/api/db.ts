import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * Доступ к binding'у D1 (`env.DB`).
 *
 * - в Cloudflare-рантайме (деплой и локальный dev через `opennext`,
 *   `npm run dev:cf`) — берётся из `getCloudflareContext()`;
 * - работает только в server-окружении (server components, server actions,
 *   route handlers, middleware). Нельзя вызывать из клиентских компонентов
 *   без передачи данных по сети.
 *
 * @throws если контекст Cloudflare недоступен (например, обычный `next dev`).
 */
export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true })
  return env.DB
}