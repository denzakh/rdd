'use client'

/**
 * Клиент матрицы с реальным персистом (docs/spec-stage-1.md §3–4).
 * onPersist → savePhaseCells (CAS), 409 → markConflict по ячейкам,
 * resolveConflict('mine') → переотправка с токеном версии сервера.
 */
import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'
import {
  MatrixGrid,
  clearConflicts,
  markConflict,
  useMatrixStore,
  type DirtyCommit,
  type MatrixColumn,
  type MatrixData,
} from '@/widgets/matrix'
import { createPhase, deletePhase, savePhaseCells } from '@/features/matrix'

export interface MatrixClientProps {
  patientId: number
  patientLabel: string
  columns: MatrixColumn[]
  data: MatrixData
  /** Токены версий CAS: { [phaseId]: updated_at }. */
  versions: Record<string, string | null>
  isReadOnly: boolean
  /** Локаль UI матрицы (RU-фолбэк). */
  locale?: 'ru' | 'en'
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict'

export default function MatrixClient({
  patientId,
  patientLabel,
  columns,
  data,
  versions,
  isReadOnly,
  locale = 'ru',
}: MatrixClientProps) {
  const router = useRouter()
  const versionsRef = useRef(versions)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [selectedPhaseId, setSelectedPhaseId] = useState(columns[0]?.id ?? '')

  // --- персист dirty-ячеек: батч группируется по фазам (§3 спеки) ---
  const handlePersist = useCallback(
    async (batch: DirtyCommit[]) => {
      setSaveState('saving')
      const byPhase = new Map<string, DirtyCommit[]>()
      for (const c of batch) {
        const arr = byPhase.get(c.phaseId) ?? []
        arr.push(c)
        byPhase.set(c.phaseId, arr)
      }

      let hasConflict = false
      try {
        const results = await Promise.all(
          [...byPhase.entries()].map(async ([phaseId, cells]) => {
            const res = await savePhaseCells(
              patientId,
              Number(phaseId),
              cells.map(({ fieldId, value }) => ({ fieldId, value })),
              versionsRef.current[phaseId] ?? null
            )
            return { phaseId, cells, res }
          })
        )

        for (const { phaseId, cells, res } of results) {
          if (!res.ok) {
            setErrorMsg(res.error)
            setSaveState('error')
            return
          }
          if (res.row) versionsRef.current[phaseId] = res.row.updated_at ?? null
          if (!res.applied) {
            hasConflict = true
            const row = res.row
            if (row) {
              // §4 спеки: ячейки «моё ≠ чужое» → конфликт; равные → только токен
              const serverRow = row as unknown as Record<string, unknown>
              for (const c of cells) {
                const mine = c.value
                const theirs = (serverRow[c.fieldId] ?? null) as DirtyCommit['value']
                if (mine !== theirs) {
                  markConflict(phaseId, c.fieldId, {
                    mine,
                    theirs,
                    serverUpdatedAt: row.updated_at ?? '',
                  })
                }
              }
            }
          }
        }
        setSaveState(hasConflict ? 'conflict' : 'saved')
      } catch {
        setErrorMsg('Ошибка сети')
        setSaveState('error')
      }
    },
    [patientId]
  )

  // --- разрешение конфликта (§4 спеки) ---
  const handleResolveConflict = useCallback(
    (phaseId: string, fieldId: string, resolution: 'mine' | 'theirs') => {
      const conflict = useMatrixStore.getState().conflicts[`${phaseId}:${fieldId}`]
      useMatrixStore.getState().resolveConflict(phaseId, fieldId, resolution)
      // 'theirs' уже записан в стор → уйдёт обычным персистом.
      // 'mine' в data не изменился → переотправляем явно с токеном сервера.
      if (resolution === 'mine' && conflict) {
        setSaveState('saving')
        void savePhaseCells(
          patientId,
          Number(phaseId),
          [{ fieldId, value: conflict.mine }],
          conflict.serverUpdatedAt
        )
          .then((res) => {
            if (res.ok && res.row) versionsRef.current[phaseId] = res.row.updated_at ?? null
            setSaveState('saved')
          })
          .catch(() => setSaveState('error'))
      }
    },
    [patientId]
  )
  const STATUS_BADGE: Record<SaveState, { text: string; className: string } | null> = {
    idle: null,
    saving: { text: 'Сохранение…', className: 'bg-neutral-100 text-neutral-600' },
    saved: { text: 'Сохранено', className: 'bg-green-100 text-green-700' },
    error: { text: 'Ошибка сохранения', className: 'bg-red-100 text-red-700' },
    conflict: { text: 'Конфликт версий', className: 'bg-amber-100 text-amber-700' },
  }

  const registryFields = Object.values(FLAT_REGISTRY) as RegistryField[]

  // --- создание/удаление фаз (§5 спеки) ---
  const handleCreatePhase = useCallback(async () => {
    setErrorMsg(null)
    const res = await createPhase(patientId)
    if (!res.ok) {
      setErrorMsg(res.error)
      setSaveState('error')
      return
    }
    router.refresh()
  }, [patientId, router])

  const handleDeletePhase = useCallback(async () => {
    if (!selectedPhaseId) return
    setErrorMsg(null)
    if (!window.confirm('Удалить выбранную фазу?')) return
    const res = await deletePhase(patientId, Number(selectedPhaseId))
    if (!res.ok) {
      setErrorMsg(res.error)
      setSaveState('error')
      return
    }
    clearConflicts(selectedPhaseId)
    setSelectedPhaseId('')
    router.refresh()
  }, [patientId, router, selectedPhaseId])

  const badge = STATUS_BADGE[saveState]

  return (
    <main className="mx-auto flex h-[100%] max-w-[1400px] flex-col space-y-4 p-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">
          {locale === 'en' ? 'Clinical Feature Matrix' : 'Матрица клинических признаков'}—{' '}
          {patientLabel}
        </h1>
        <p className="text-sm text-neutral-500">
          {locale === 'en'
            ? 'Input is committed on blur/debounce and saved to the server · arrows — navigate rows'
            : 'Ввод коммитится по blur/дебаунсу и сохраняется на сервере · стрелки — навигация по строкам'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {badge && (
            <span
              role="status"
              className={`rounded px-2 py-0.5 text-xs ${badge.className}`}
              title={saveState === 'error' ? (errorMsg ?? undefined) : undefined}
            >
              {badge.text}
            </span>
          )}
          {!isReadOnly && (
            <>
              <button
                type="button"
                onClick={() => void handleCreatePhase()}
                className="rounded-md border border-neutral-900 bg-neutral-900 px-3 py-1 text-xs text-white"
              >
                {locale === 'en' ? '+ Phase' : '+ Фаза'}
              </button>
              {columns.length > 0 && (
                <>
                  <select
                    value={selectedPhaseId}
                    onChange={(e) => setSelectedPhaseId(e.target.value)}
                    className="h-7 rounded border border-neutral-300 bg-white px-1 text-xs"
                    aria-label={locale === 'en' ? 'Phase to delete' : 'Фаза для удаления'}
                  >
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleDeletePhase()}
                    className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                  >
                    {locale === 'en' ? 'Delete phase' : 'Удалить фазу'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <div className="h-[100px] grow">
        <MatrixGrid
          registryFields={registryFields}
          columns={columns}
          data={data}
          isReadOnly={isReadOnly}
          locale={locale}
          onPersist={(batch) => void handlePersist(batch)}
          onResolveConflict={handleResolveConflict}
        />
      </div>
    </main>
  )
}
