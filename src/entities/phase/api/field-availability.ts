/**
 * Реэкспорт доступности полей 98/99 (реализация — shared-слой,
 * чтобы UI `matrix-grid` не тянул entities и не ловил циклы).
 * См. `src/shared/lib/registry/field-availability.ts`.
 */
export { isFieldDisabledForPhase } from '@/shared/lib/registry/field-availability'
