'use client'

import { MatrixGrid } from '@/widgets/matrix'
import type { MatrixColumn, MatrixData } from '@/widgets/matrix'
import { FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'

/**
 * Демо-страница виджета «Матрица» (docs/matrix.md).
 * Данные mock: реального API фаз в проекте пока нет — при появлении
 * `data` приходит из `phase-repo.listByPatient`, а onPersist пишет
 * через `phase-repo.update(id, patch)`.
 */
const registryFields = Object.values(FLAT_REGISTRY) as RegistryField[]

const columns: MatrixColumn[] = [
  { id: 'p1', title: 'Анамнез (фаза 1)', order: 1 },
  { id: 'p2', title: 'Фаза 2', order: 2 },
  { id: 'p3', title: 'Фаза 3', order: 3 },
  { id: 's98', title: 'Текущий статус (98)', order: 4, isCurrentStatus: true },
  { id: 's99', title: 'Выход (99)', order: 5 },
]

const data: MatrixData = {
  p1: { phase_start_date: '2019-03-01', phase_duration_months: 6, main_component: 1 },
  p2: { phase_start_date: '2020-01-15', phase_duration_months: 4 },
  p3: {},
  s98: { phase_start_date: '2021-06-01' },
  s99: {},
}

export default function MatrixDemoPage() {
  return (
    <main className="mx-auto max-w-[1400px] space-y-4 p-6">
      <header>
        <h1 className="text-xl font-semibold">Матрица клинических признаков</h1>
        <p className="text-sm text-neutral-500">
          Виртуализированный грид · sticky-колонка и заголовок · ввод коммитится по blur/дебаунсу ·
          стрелки Up/Down — навигация по строкам
        </p>
      </header>
      <MatrixGrid
        registryFields={registryFields}
        columns={columns}
        data={data}
        onPersist={(batch) => {
          // Демо: лог батча. В проде — PATCH на API фазы.
          console.log('[matrix] persist batch:', batch)
        }}
      />
    </main>
  )
}
