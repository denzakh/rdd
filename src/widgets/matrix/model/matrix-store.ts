import { create } from 'zustand'
import type { FieldValue } from '../types'

export type MatrixData = Record<string, Record<string, FieldValue>>

interface MatrixState {
  data: MatrixData
  setValue: (phaseId: string, fieldId: string, value: FieldValue) => void
}

/**
 * Стор грида «Матрица» (решение 2-C спеки docs/matrix.md).
 *
 * Каждая ячейка подписывается на свой срез через `useCell` — при вводе
 * ререндерится ровно одна ячейка (zustand сравнивает результат селектора
 * через Object.is и не уведомляет React при неизменном примитиве).
 *
 * Синхронизация с API — вне React, через `subscribeDirty` (см. ниже).
 */
export const useMatrixStore = create<MatrixState>((set) => ({
  data: {},
  setValue: (phaseId, fieldId, value) =>
    set((s) => ({
      data: {
        ...s.data,
        [phaseId]: { ...s.data[phaseId], [fieldId]: value },
      },
    })),
}))

/** Гранулярный селектор: подписка строго на одну ячейку. */
export const useCell = (phaseId: string, fieldId: string): FieldValue =>
  useMatrixStore((s) => s.data[phaseId]?.[fieldId] ?? null)

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
