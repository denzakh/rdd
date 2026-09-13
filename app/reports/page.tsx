import { Header, requireUser } from '@/features/auth'
import { ExportPanel } from '@/features/reports'
import { getDb } from '@/shared/api/db'
import { FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'
import { patientScopeFor } from '@/entities/patient'
import { getLocale } from '@/shared/lib/intl'
import { countByField, phaseDurationsByOrder, efficacyByMainComponent } from '@/entities/phase'

/**
 * Простая аналитика (docs/spec-stage-2.md §4): распределения по признакам,
 * средние длительности фаз, эффективность АД по основному компоненту.
 */
const INTERESTING_FIELDS = ['main_component', 'ad_efficacy', 'switch_reason', 'prophylaxis_type']

function labelOf(fieldId: string, value: number, locale: 'ru' | 'en' = 'ru'): string {
  const field = (FLAT_REGISTRY as unknown as Record<string, RegistryField>)[fieldId]
  const opt = field?.options?.find((o) => String(o.value) === String(value))
  if (opt)
    return typeof opt.label === 'string' ? opt.label : locale === 'en' ? opt.label.en : opt.label.ru
  const base = field
    ? typeof field.label === 'string'
      ? field.label
      : locale === 'en'
        ? field.label.en
        : field.label.ru
    : fieldId
  return `${base}: ${value}`
}

function fieldTitle(fieldId: string, locale: 'ru' | 'en' = 'ru'): string {
  const field = (FLAT_REGISTRY as unknown as Record<string, RegistryField>)[fieldId]
  if (!field) return fieldId
  return typeof field.label === 'string'
    ? field.label
    : locale === 'en'
      ? field.label.en
      : field.label.ru
}

export default async function ReportsPage() {
  const user = await requireUser()
  const db = await getDb()
  const locale = await getLocale()
  const en = locale === 'en'

  const distributions = await Promise.all(
    INTERESTING_FIELDS.map(async (f) => ({
      fieldId: f,
      rows: await countByField(db, f, patientScopeFor(user)),
    }))
  )
  const durations = await phaseDurationsByOrder(db, patientScopeFor(user))
  const efficacy = await efficacyByMainComponent(db, patientScopeFor(user))

  return (
    <div>
      <Header displayName={user.displayName} role={user.role} />
      <main className="mx-auto max-w-[1000px] space-y-8 p-6">
        <h1 className="text-xl font-semibold">{en ? 'Reports' : 'Отчёты'}</h1>

        <p className="text-xs text-neutral-500">
          {en
            ? 'Aggregates respect your data_scope (the same patient visibility as in lists).'
            : 'Агрегаты учитывают ваш data_scope (та же видимость пациентов, что и в списках).'}
        </p>

        <ExportPanel locale={locale} />

        <section className="grid grid-cols-2 gap-6">
          {distributions.map(({ fieldId, rows }) => (
            <div key={fieldId}>
              <h2 className="mb-2 text-sm font-semibold">{fieldTitle(fieldId, locale)}</h2>
              {rows.length === 0 ? (
                <p className="text-xs text-neutral-500">{en ? 'No data' : 'Нет данных'}</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.value} className="border-b border-neutral-100">
                        <td className="px-2 py-1">{labelOf(fieldId, r.value, locale)}</td>
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
          <h2 className="mb-2 text-sm font-semibold">
            {en ? 'Average phase durations' : 'Средние длительности фаз'}
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                <th className="px-2 py-1.5">{en ? 'Phase #' : '№ фазы'}</th>
                <th className="px-2 py-1.5">{en ? 'Phases' : 'Фаз'}</th>
                <th className="px-2 py-1.5">{en ? 'Avg duration, mo' : 'Ср. длительность, мес'}</th>
                <th className="px-2 py-1.5">
                  {en ? 'Avg intermission, mo' : 'Ср. интермиссия, мес'}
                </th>
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
          <h2 className="mb-2 text-sm font-semibold">
            {en ? 'AD efficacy × main component' : 'Эффективность АД × основной компонент'}
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                <th className="px-2 py-1.5">{en ? 'Component' : 'Компонент'}</th>
                <th className="px-2 py-1.5">{en ? 'Efficacy' : 'Эффективность'}</th>
                <th className="px-2 py-1.5">{en ? 'Phases' : 'Фаз'}</th>
              </tr>
            </thead>
            <tbody>
              {efficacy.map((e, i) => (
                <tr key={i} className="border-b border-neutral-100">
                  <td className="px-2 py-1.5">
                    {labelOf('main_component', e.main_component, locale)}
                  </td>
                  <td className="px-2 py-1.5">{labelOf('ad_efficacy', e.ad_efficacy, locale)}</td>
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
