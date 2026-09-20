import { create } from 'zustand'
import type { FieldValue } from './types'

export type MatrixData = Record<string, Record<string, FieldValue>>

/** Конфликт ячейки: «моё» уже в data, «чужое» — здесь (§6.5 спеки). */
export interface CellConflict {
  mine: FieldValue
  theirs: FieldValue
  /** Токен версии сервера, с которым пройдёт повторный PATCH. */
  serverUpdatedAt: string
  actor?: string
}

export type MatrixConflicts = Record<string, CellConflict>

interface MatrixState {
  data: MatrixData
  conflicts: MatrixConflicts
  setValue: (phaseId: string, fieldId: string, value: FieldValue) => void
  markConflict: (phaseId: string, fieldId: string, c: CellConflict) => void
  resolveConflict: (phaseId: string, fieldId: string, resolution: 'mine' | 'theirs') => void
  clearConflicts: (phaseId: string) => void
}

/**
 * Стор грида «Матрица» (решение 2-C спеки docs/ru/matrix.md).
 *
 * Каждая ячейка подписывается на свой срез через `useCell` — при вводе
 * ререндерится ровно одна ячейка (zustand сравнивает результат селектора
 * через Object.is и не уведомляет React при неизменном примитиве).
 *
 * Синхронизация с API — вне React, через `subscribeDirty` (см. ниже).
 */
export const useMatrixStore = create<MatrixState>((set) => ({
  data: {},
  conflicts: {},
  setValue: (phaseId, fieldId, value) =>
    set((s) => ({
      data: {
        ...s.data,
        [phaseId]: { ...s.data[phaseId], [fieldId]: value },
      },
    })),
  markConflict: (phaseId, fieldId, c) =>
    set((s) => ({
      conflicts: { ...s.conflicts, [`${phaseId}:${fieldId}`]: c },
    })),
  resolveConflict: (phaseId, fieldId, resolution) =>
    set((s) => {
      const key = `${phaseId}:${fieldId}`
      const c = s.conflicts[key]
      if (!c) return s
      const restConflicts = { ...s.conflicts }
      delete restConflicts[key]
      return {
        conflicts: restConflicts,
        data:
          resolution === 'theirs'
            ? {
                ...s.data,
                [phaseId]: { ...s.data[phaseId], [fieldId]: c.theirs },
              }
            : s.data, // 'mine' — значение уже в data
      }
    }),
  clearConflicts: (phaseId) =>
    set((s) => {
      const prefix = `${phaseId}:`
      const rest = Object.fromEntries(
        Object.entries(s.conflicts).filter(([k]) => !k.startsWith(prefix))
      )
      return { conflicts: rest }
    }),
}))

/** Гранулярный селектор: подписка строго на одну ячейку. */
export const useCell = (phaseId: string, fieldId: string): FieldValue =>
  useMatrixStore((s) => s.data[phaseId]?.[fieldId] ?? null)

/** Селектор конфликта ячейки (§6.5). */
export const useCellConflict = (phaseId: string, fieldId: string): CellConflict | undefined =>
  useMatrixStore((s) => s.conflicts[`${phaseId}:${fieldId}`])

/** Императивные экшены (для обработчиков вне React-компонентов, напр. 409). */
export const markConflict = useMatrixStore.getState().markConflict
export const resolveConflict = useMatrixStore.getState().resolveConflict
export const clearConflicts = useMatrixStore.getState().clearConflicts

/** Инициализация данных грида (вызывается из MatrixGrid при монтировании). */
export function initMatrixData(data: MatrixData): void {
  useMatrixStore.setState({ data })
}

/**
 * Dirty-очередь для персиста вне React-ререндеров (§2.2 спеки).
 * Возвращает функцию отписки. Колбэк получает «сырые» (prev, next)
 * состояния и DebounceCommit с батчем изменённых ячеек.
 */
export interface DirtyCommit {
  phaseId: string
  fieldId: string
  value: FieldValue
}

export function subscribeDirty(callback: (batch: DirtyCommit[]) => void): () => void {
  let prev = useMatrixStore.getState().data
  const pending = new Map<string, DirtyCommit>()
  let timer: ReturnType<typeof setTimeout> | null = null

  const flush = () => {
    timer = null
    if (pending.size === 0) return
    const batch = [...pending.values()]
    pending.clear()
    callback(batch)
  }

  const unsubscribe = useMatrixStore.subscribe((state) => {
    const next = state.data
    for (const phaseId of Object.keys(next)) {
      const prevRow = prev[phaseId]
      const nextRow = next[phaseId]
      if (prevRow === nextRow) continue
      for (const fieldId of Object.keys(nextRow)) {
        if (prevRow?.[fieldId] !== nextRow[fieldId]) {
          pending.set(`${phaseId}:${fieldId}`, {
            phaseId,
            fieldId,
            value: nextRow[fieldId],
          })
        }
      }
    }
    prev = next
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, 300) // дебаунс 300ms, §2.2 спеки
  })

  return () => {
    unsubscribe()
    if (timer) clearTimeout(timer)
  }
}
