import { requireUser, UserMenu } from '@/features/auth'
import { ExportPanel } from '@/features/reports'
import { getDb } from '@/shared/api/db'
import { FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'
import { countByField, phaseDurationsByOrder, efficacyByMainComponent } from '@/entities/phase'

/**
 * Простая аналитика (docs/spec-stage-2.md §4): распределения по признакам,
 * средние длительности фаз, эффективность АД по основному компоненту.
 */
const INTERESTING_FIELDS = ['main_component', 'ad_efficacy', 'switch_reason', 'prophylaxis_type']

function labelOf(fieldId: string, value: number): string {
  const field = (FLAT_REGISTRY as unknown as Record<string, RegistryField>)[fieldId]
  const opt = field?.options?.find((o) => String(o.value) === String(value))
  if (opt) return opt.label
  const base = field ? (typeof field.label === 'string' ? field.label : field.label.ru) : fieldId
  return `${base}: ${value}`
}

function fieldTitle(fieldId: string): string {
  const field = (FLAT_REGISTRY as unknown as Record<string, RegistryField>)[fieldId]
  if (!field) return fieldId
  return typeof field.label === 'string' ? field.label : field.label.ru
}

export default async function ReportsPage() {
  const user = await requireUser()
  const db = await getDb()

  const distributions = await Promise.all(
    INTERESTING_FIELDS.map(async (f) => ({ fieldId: f, rows: await countByField(db, f) }))
  )
  const durations = await phaseDurationsByOrder(db)
  const efficacy = await efficacyByMainComponent(db)

  return (
    <div>
      <UserMenu displayName={user.displayName} role={user.role} />
      <main className="mx-auto max-w-[1000px] space-y-8 p-6">
        <h1 className="text-xl font-semibold">Отчёты</h1>

        <ExportPanel />

        <section className="grid grid-cols-2 gap-6">
          {distributions.map(({ fieldId, rows }) => (
            <div key={fieldId}>
              <h2 className="mb-2 text-sm font-semibold">{fieldTitle(fieldId)}</h2>
              {rows.length === 0 ? (
                <p className="text-xs text-neutral-500">Нет данных</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.value} className="border-b border-neutral-100">
                        <td className="px-2 py-1">{labelOf(fieldId, r.value)}</td>
                        <td className="px-2 py-1 text-right font-medium">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Средние длительности фаз</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                <th className="px-2 py-1.5">№ фазы</th>
                <th className="px-2 py-1.5">Фаз</th>
                <th className="px-2 py-1.5">Ср. длительность, мес</th>
                <th className="px-2 py-1.5">Ср. интермиссия, мес</th>
              </tr>
            </thead>
            <tbody>
              {durations.map((d) => (
                <tr key={d.phase_order_id} className="border-b border-neutral-100">
                  <td className="px-2 py-1.5">{d.phase_order_id}</td>
                  <td className="px-2 py-1.5">{d.patients}</td>
                  <td className="px-2 py-1.5">{d.avg_phase.toFixed(1)}</td>
                  <td className="px-2 py-1.5">
                    {d.avg_intermission === null ? '—' : d.avg_intermission.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Эффективность АД × основной компонент</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                <th className="px-2 py-1.5">Компонент</th>
                <th className="px-2 py-1.5">Эффективность</th>
                <th className="px-2 py-1.5">Фаз</th>
              </tr>
            </thead>
            <tbody>
              {efficacy.map((e, i) => (
                <tr key={i} className="border-b border-neutral-100">
                  <td className="px-2 py-1.5">{labelOf('main_component', e.main_component)}</td>
                  <td className="px-2 py-1.5">{labelOf('ad_efficacy', e.ad_efficacy)}</td>
                  <td className="px-2 py-1.5">{e.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  )
}
