import { buildHighlights, type LandingDict } from '../model/landing-content'

/**
 * Блок «Ключевые инженерные решения» (docs/ru/spec-public-1.md §3 п.4):
 * 3 колонки — registry-core (SSOT), виртуализированный грид с CAS, edge-стек.
 */
export function LandingHighlights({ dict }: { dict: LandingDict }) {
  const highlights = buildHighlights(dict)

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-neutral-900">{dict.techHighlightsTitle}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {highlights.map((h) => (
          <div
            key={h.title}
            className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/50 p-5"
          >
            <h3 className="text-sm font-semibold text-neutral-900">{h.title}</h3>
            <p className="text-xs leading-relaxed text-neutral-600">{h.text1}</p>
            <p className="text-xs leading-relaxed text-neutral-600">{h.text2}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
