/**
 * Константы и типы домена пользователей — БЕЗ server-зависимостей.
 *
 * Отдельный файл нужен потому, что 'use client' компоненты (create-user-form,
 * users-table, invites-panel) используют ROLES/DATA_SCOPES при рендере, и при
 * импорте из user-repo они тянут за собой node:crypto и getDb() → падает сборка
 * (Module build failed: UnhandledSchemeError: Reading from "node:crypto").
 */

export type Role = 'admin' | 'clinician' | 'readonly'
export const ROLES: readonly Role[] = ['admin', 'clinician', 'readonly'] as const

export type DataScope = 'all' | 'site' | 'assigned'
export const DATA_SCOPES: readonly DataScope[] = ['all', 'site', 'assigned'] as const

export const DATA_SCOPE_LABELS: Record<DataScope, string> = {
  all: 'все пациенты',
  site: 'свой центр',
  assigned: 'только назначенные',
}
