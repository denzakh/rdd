import type { LandingDict } from '../model/landing-content'

/**
 * Блок «Границы демонстрационной версии» (docs/ru/spec-public-1.md §3 п.5):
 * что сознательно вынесено за scope (регуляторика, WAF, backup/DR).
 */
export function LandingBoundaries({ dict }: { dict: LandingDict }) {
  return (
    <section className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/50 p-5">
      <h3 className="text-sm font-semibold text-amber-900">{dict.boundariesTitle}</h3>
      <p className="text-xs leading-relaxed text-amber-800">{dict.boundariesText}</p>
    </section>
  )
}
