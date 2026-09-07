'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { RegistryField } from '@/shared/config/registry/types'
import { applyComputed } from '@/shared/api/with-computed'
import {
  initMatrixData,
  subscribeDirty,
  useCell,
  useCellConflict,
  useMatrixStore,
  type CellConflict,
  type DirtyCommit,
  type MatrixData,
} from '../model/matrix-store'
import { buildMatrixRows, fieldLabel, isComputedField } from '../model/matrix-rows'
import { validateCellValue } from '../model/validate'
import type { FieldValue, MatrixColumn, MatrixScope } from '../types'
import { MatrixCell } from './matrix-cell'

export interface MatrixGridProps {
  registryFields: RegistryField[]
  columns: MatrixColumn[]
  /** Начальные данные { [phaseId]: { [fieldId]: value } }. */
  data: MatrixData
  isReadOnly?: boolean
  /** Персист батча dirty-ячеек (вызывается вне React, с дебаунсом 300ms). */
  onPersist?: (batch: DirtyCommit[]) => void
  /**
   * Перехват разрешения конфликта (docs/spec-stage-1.md §4): по умолчанию —
   * локальный resolveConflict стора; клиент может дополнительно переотправить
   * «своё» значение с токеном версии сервера.
   */
  onResolveConflict?: (phaseId: string, fieldId: string, resolution: 'mine' | 'theirs') => void
  /** Секции реестра; по умолчанию — все, кроме patient. */
  scopes?: readonly MatrixScope[]
}

const ROW_H = 40 // фиксированная высота строки (§2.1 спеки — строго)
const HEADER_H = 48
const LABEL_W = 320 // ширина sticky-колонки (§1.2 спеки)
const COL_W = 150

/** Колонка 98: поля is_current_only доступны только в текущем статусе. */
function disabledFor(field: RegistryField, col: MatrixColumn): boolean {
  return Boolean(field.is_current_only && !col.isCurrentStatus)
}

/**
 * Коннектор ячейки: изолирует подписку useCell (хук) от мемоизированной
 * MatrixCell. Ререндерится только при смене значения своей ячейки.
 */
function CellConnector({
  phaseId,
  field,
  col,
  isReadOnly,
  isComputed,
  computedValue,
  error,
  onChange,
  onResolveConflict,
  tabIndex,
  row,
  colIdx,
  registerCellRef,
}: {
  phaseId: string
  field: RegistryField
  col: MatrixColumn
  isReadOnly: boolean
  isComputed: boolean
  computedValue: FieldValue
  error?: string
  onChange: (phaseId: string, fieldId: string, value: FieldValue) => void
  onResolveConflict: (phaseId: string, fieldId: string, resolution: 'mine' | 'theirs') => void
  tabIndex: number
  row: number
  colIdx: number
  registerCellRef: (row: number, col: number) => (el: HTMLElement | null) => void
}) {
  const storeValue = useCell(phaseId, field.id)
  const conflict: CellConflict | undefined = useCellConflict(phaseId, field.id)
  const value: FieldValue = isComputed ? computedValue : storeValue
  const disabled = isReadOnly || isComputed || disabledFor(field, col)

  return (
    <div
      ref={registerCellRef(row, colIdx)}
      tabIndex={tabIndex}
      data-matrix-cell={`${row}:${colIdx}`}
      className={`focus-within:bg-accent/30 flex-1 border-b border-neutral-200 outline-none ${
        col.isCurrentStatus ? 'border-l-2 border-l-amber-500' : 'border-r border-neutral-200'
      }`}
      style={{ minWidth: COL_W, height: ROW_H }}
    >
      <MatrixCell
        phaseId={phaseId}
        fieldId={field.id}
        ui={field.ui}
        value={value}
        disabled={disabled}
        error={error}
        conflict={conflict}
        options={field.options}
        onChange={onChange}
        onResolveConflict={onResolveConflict}
      />
    </div>
  )
}

/**
 * Виджет «Матрица» (docs/matrix.md).
 * Решения: 1-A (sticky-ячейка внутри виртуализированного ряда),
 * 2-C (zustand), 3-A (мемоизация), 4-A (declarative focus), 5-C (desktop-only).
 */
export function MatrixGrid({
  registryFields,
  columns,
  data,
  isReadOnly = false,
  onPersist,
  onResolveConflict: onResolveConflictProp,
  scopes,
}: MatrixGridProps) {
  // --- стор: инициализация данных (по сериализованному ключу) ---
  const initialDataKey = useMemo(() => JSON.stringify(data), [data])
  useEffect(() => {
    initMatrixData(JSON.parse(initialDataKey) as MatrixData)
  }, [initialDataKey])

  // --- персист dirty-ячеек вне React-ререндеров (§2.2) ---
  useEffect(() => {
    if (!onPersist) return
    return subscribeDirty(onPersist)
  }, [onPersist])

  // --- строки (секции + поля) ---
  const rows = useMemo(() => buildMatrixRows(scopes), [scopes])
  const fieldById = useMemo(() => {
    const m = new Map<string, RegistryField>()
    for (const f of registryFields) m.set(f.id, f)
    return m
  }, [registryFields])

  // вычисляемые поля: значение на колонку (§3 спеки, badge-readonly)
  const computedByPhase = useMemo(() => {
    const store = useMatrixStore.getState().data
    const map = new Map<string, Record<string, unknown>>()
    for (const col of columns) {
      map.set(col.id, applyComputed(store[col.id] ?? {}, 'phase'))
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDataKey, columns])

  // --- виртуализация строк (§2.1) ---
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 5,
  })

  // --- клавиатурная навигация (решение 4-A) ---
  const cellRefs = useRef(new Map<string, HTMLElement>())
  const activeRef = useRef<[number, number]>([1, 0]) // [row, col]; старт — первое поле
  const [, forceRender] = useState(0)

  const registerCellRef = useCallback(
    (row: number, col: number) => (el: HTMLElement | null) => {
      if (el) cellRefs.current.set(`${row}:${col}`, el)
      else cellRefs.current.delete(`${row}:${col}`)
    },
    []
  )

  const moveFocus = useCallback(
    (row: number, col: number) => {
      const r = Math.max(0, Math.min(rows.length - 1, row))
      const c = Math.max(0, Math.min(columns.length - 1, col))
      activeRef.current = [r, c]
      rowVirtualizer.scrollToIndex(r, { align: 'auto' })
      requestAnimationFrame(() => {
        cellRefs.current.get(`${r}:${c}`)?.focus()
      })
      forceRender((n) => n + 1) // обновить roving tabindex
    },
    [rows.length, columns.length, rowVirtualizer]
  )

  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent, rowIdx: number) => {
      const [r, c] = activeRef.current
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveFocus(r + 1, c)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveFocus(r - 1, c)
      } else if (e.key === 'ArrowRight' && (e.target as HTMLElement).dataset.matrixCell) {
        e.preventDefault()
        moveFocus(r, c + 1)
      } else if (e.key === 'ArrowLeft' && (e.target as HTMLElement).dataset.matrixCell) {
        e.preventDefault()
        moveFocus(r, c - 1)
      } else if (e.key === 'Tab') {
        activeRef.current = [rowIdx, activeRef.current[1]]
      }
    },
    [moveFocus]
  )

  // --- стабильный commit (решение 3-A, §2.3) ---
  const commit = useCallback(
    (phaseId: string, fieldId: string, value: FieldValue) => {
      const field = fieldById.get(fieldId)
      const error = field ? validateCellValue(field, value) : undefined
      if (error !== undefined) {
        setCellErrors((prev) => ({ ...prev, [`${phaseId}:${fieldId}`]: error }))
        return // невалидное значение в стор не пишется
      }
      setCellErrors((prev) => {
        if (prev[`${phaseId}:${fieldId}`] === undefined) return prev
        const next = { ...prev }
        delete next[`${phaseId}:${fieldId}`]
        return next
      })
      useMatrixStore.getState().setValue(phaseId, fieldId, value)
    },
    [fieldById]
  )

  const [cellErrors, setCellErrors] = useState<Record<string, string | undefined>>({})

  // стабильный обработчик разрешения конфликта (§6.5); перехват клиентом
  const resolveConflict = useCallback(
    (phaseId: string, fieldId: string, resolution: 'mine' | 'theirs') => {
      useMatrixStore.getState().resolveConflict(phaseId, fieldId, resolution)
    },
    []
  )
  const resolveConflictHandler = onResolveConflictProp ?? resolveConflict

  const gridWidth = LABEL_W + columns.length * COL_W

  return (
    <div className="min-w-[1024px]">
      {' '}
      {/* решение 5-C: desktop-only */}
      <div
        ref={scrollRef}
        className="bg-background relative max-h-[calc(100vh-120px)] overflow-auto rounded-md border border-neutral-200"
      >
        <div style={{ height: rowVirtualizer.getTotalSize() + HEADER_H, minWidth: gridWidth }}>
          {/* --- Заголовок (ось X, sticky top, z-20) --- */}
          <div className="bg-background sticky top-0 z-20 flex" style={{ height: HEADER_H }}>
            <div
              className="bg-background sticky left-0 z-30 flex items-center border-r border-b border-neutral-200 px-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase"
              style={{ width: LABEL_W, minWidth: LABEL_W }}
            >
              Признак
            </div>
            {columns.map((col) => (
              <div
                key={col.id}
                className={`flex flex-1 items-center border-b border-neutral-200 px-2 text-xs font-semibold ${
                  col.isCurrentStatus
                    ? 'border-l-2 border-l-amber-500 text-amber-700'
                    : 'border-r border-neutral-200'
                }`}
                style={{ minWidth: COL_W }}
              >
                {col.title}
              </div>
            ))}
          </div>

          {/* --- Виртуализированные строки (§2.1: translateY, sticky внутри ряда) --- */}
          {rowVirtualizer.getVirtualItems().map((vRow) => {
            const row = rows[vRow.index]
            const isSection = row.kind === 'section'
            return (
              <div
                key={vRow.key}
                className="hover:bg-accent/50 absolute left-0 flex"
                style={{
                  height: vRow.size,
                  width: '100%',
                  minWidth: gridWidth,
                  transform: `translateY(${vRow.start + HEADER_H}px)`,
                }}
                onKeyDown={isSection ? undefined : (e) => handleRowKeyDown(e, vRow.index)}
              >
                {isSection ? (
                  <>
                    <div
                      className="bg-muted sticky left-0 z-10 flex items-center px-3 text-sm font-semibold"
                      style={{ width: LABEL_W, minWidth: LABEL_W }}
                    >
                      {row.title}
                    </div>
                    <div className="bg-muted flex-1" />
                  </>
                ) : (
                  <>
                    <div
                      className="bg-background sticky left-0 z-10 flex items-center gap-2 border-r border-b border-neutral-200 px-3"
                      style={{ width: LABEL_W, minWidth: LABEL_W }}
                    >
                      <span className="truncate text-sm">{fieldLabel(row.field)}</span>
                      {isComputedField(row.field) && (
                        <span className="ml-auto shrink-0 rounded bg-neutral-100 px-1 text-[10px] text-neutral-500">
                          авто
                        </span>
                      )}
                    </div>
                    {columns.map((col, colIdx) => (
                      <CellConnector
                        key={col.id}
                        phaseId={col.id}
                        field={row.field}
                        col={col}
                        isReadOnly={isReadOnly}
                        isComputed={isComputedField(row.field)}
                        computedValue={
                          (computedByPhase.get(col.id)?.[row.field.id] as FieldValue) ?? null
                        }
                        error={cellErrors[`${col.id}:${row.field.id}`]}
                        onChange={commit}
                        onResolveConflict={resolveConflictHandler}
                        tabIndex={
                          activeRef.current[0] === vRow.index && activeRef.current[1] === colIdx
                            ? 0
                            : -1
                        }
                        row={vRow.index}
                        colIdx={colIdx}
                        registerCellRef={registerCellRef}
                      />
                    ))}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
