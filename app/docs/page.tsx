import Link from 'next/link'
import { Header, requireUser } from '@/features/auth'
import { getDict } from '@/shared/lib/intl'

/**
 * Приватный `/docs` (docs/ru/spec-public-2.md §3): курированные выжимки вместо
 * зеркала всех md — архитектура, безопасность (угроза → мера → где),
 * NFR/RTO/RPO, roadmap и живой `/data-dictionary` внутренней ссылкой.
 * Полные тексты (deployment/auth/threat-model) в рантайм не копируются:
 * только выжимки из словаря `docsHub` + внешние ссылки на GitHub.
 */
export default async function DocsPage() {
  const user = await requireUser()
  const dict = await getDict('docsHub')

  const securityRows = [
    { threat: dict.securityRow1, measure: dict.securityMeasure1, where: dict.securityWhere1 },
    { threat: dict.securityRow2, measure: dict.securityMeasure2, where: dict.securityWhere2 },
    { threat: dict.securityRow3, measure: dict.securityMeasure3, where: dict.securityWhere3 },
    { threat: dict.securityRow4, measure: dict.securityMeasure4, where: dict.securityWhere4 },
    { threat: dict.securityRow5, measure: dict.securityMeasure5, where: dict.securityWhere5 },
  ]

  const outboundLink = 'inline-block text-xs text-cyan-700 hover:opacity-80'

  return (
    <div>
      <Header displayName={user.displayName} role={user.role} />
      <main className="mx-auto max-w-[1000px] space-y-6 p-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">{dict.title}</h1>
          <p className="text-sm text-neutral-600">{dict.intro}</p>
        </header>

        <section className="space-y-2 rounded-lg border border-neutral-200 p-4">
          <h2 className="font-semibold">{dict.architectureTitle}</h2>
          <p className="text-sm text-neutral-600">{dict.architectureText}</p>
          <a href={dict.architectureUrl} target="_blank" rel="noreferrer" className={outboundLink}>
            {dict.architectureLink} ↗
          </a>
        </section>

        <section className="space-y-3 rounded-lg border border-neutral-200 p-4">
          <h2 className="font-semibold">{dict.securityTitle}</h2>
          <p className="text-sm text-neutral-600">{dict.securityText}</p>
          <div className="overflow-x-auto rounded-md border border-neutral-300">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-100 text-left">
                  <th className="border-b border-neutral-300 px-3 py-2">
                    {dict.securityColThreat}
                  </th>
                  <th className="border-b border-neutral-300 px-3 py-2">
                    {dict.securityColMeasure}
                  </th>
                  <th className="border-b border-neutral-300 px-3 py-2">{dict.securityColWhere}</th>
                </tr>
              </thead>
              <tbody>
                {securityRows.map((row) => (
                  <tr key={row.threat} className="align-top even:bg-neutral-50">
                    <td className="border-b border-neutral-200 px-3 py-2">{row.threat}</td>
                    <td className="border-b border-neutral-200 px-3 py-2 text-neutral-600">
                      {row.measure}
                    </td>
                    <td className="border-b border-neutral-200 px-3 py-2 font-mono text-xs">
                      {row.where}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={dict.securityAuthUrl}
              target="_blank"
              rel="noreferrer"
              className={outboundLink}
            >
              {dict.securityAuthLink} ↗
            </a>
            <a
              href={dict.securityThreatUrl}
              target="_blank"
              rel="noreferrer"
              className={outboundLink}
            >
              {dict.securityThreatLink} ↗
            </a>
          </div>
        </section>

        <section className="space-y-2 rounded-lg border border-neutral-200 p-4">
          <h2 className="font-semibold">{dict.nfrTitle}</h2>
          <p className="text-sm text-neutral-600">{dict.nfrText}</p>
          <a href={dict.nfrUrl} target="_blank" rel="noreferrer" className={outboundLink}>
            {dict.nfrLink} ↗
          </a>
        </section>

        <section className="space-y-2 rounded-lg border border-neutral-200 p-4">
          <h2 className="font-semibold">{dict.roadmapTitle}</h2>
          <p className="text-sm text-neutral-600">{dict.roadmapText}</p>
          <a href={dict.roadmapUrl} target="_blank" rel="noreferrer" className={outboundLink}>
            {dict.roadmapLink} ↗
          </a>
        </section>

        <section className="space-y-2 rounded-lg border border-neutral-200 p-4">
          <h2 className="font-semibold">{dict.dictionaryTitle}</h2>
          <p className="text-sm text-neutral-600">{dict.dictionaryText}</p>
          <Link href="/data-dictionary" className={outboundLink}>
            {dict.dictionaryLink}
          </Link>
        </section>
      </main>
    </div>
  )
}
