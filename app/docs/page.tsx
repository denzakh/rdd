import Link from 'next/link'
import { Header, requireUser } from '@/features/auth'
import { getDict, getLocale } from '@/shared/lib/intl'

/** Корень документации в GitHub; локаль выбирается по cookie `rdd_locale`. */
const DOCS_BASE = 'https://github.com/denzakh/rdd/blob/main/docs'

/**
 * Приватный `/docs` (docs/ru/spec-public-2.md §3): курированные выжимки, а не
 * зеркало всех md. Структура страницы — «функция → проблема → решение → почему
 * так», сгруппированная по четырём областям; каждая карточка ссылается на
 * конкретный документ репозитория (`docs/<locale>/<file>`), полные тексты в
 * рантайм не копируются. Ниже — таблица угроз, быстрые ссылки внутрь
 * приложения, границы демо-проекта и индекс всей документации.
 */
export default async function DocsPage() {
  const [user, dict, locale] = await Promise.all([requireUser(), getDict('docsHub'), getLocale()])

  const docUrl = (file: string) => `${DOCS_BASE}/${locale}/${file}`
  const outbound = 'text-xs text-cyan-700 hover:opacity-80'
  const cardLink = 'mt-auto pt-2 text-xs text-cyan-700 hover:opacity-80'

  return (
    <div>
      <Header displayName={user.displayName} role={user.role} />
      <main className="mx-auto max-w-[1100px] space-y-8 p-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">{dict.title}</h1>
          <p className="max-w-[80ch] text-sm text-neutral-600">{dict.intro}</p>
        </header>

        {/* Функции: сетка карточек «проблема → решение → почему» по группам. */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold">{dict.featuresTitle}</h2>
          {dict.groups.map((group) => (
            <div key={group.id} className="space-y-2">
              <h3 className="text-sm font-medium tracking-wide text-neutral-500 uppercase">
                {group.title}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.cards.map((card) => (
                  <article
                    key={card.title}
                    className="flex flex-col rounded-lg border border-neutral-200 bg-white p-4"
                  >
                    <h4 className="font-semibold text-neutral-900">{card.title}</h4>
                    <dl className="mt-2 space-y-1.5 text-sm">
                      <div>
                        <dt className="inline font-medium text-neutral-700">
                          {dict.problemLabel}:{' '}
                        </dt>
                        <dd className="inline text-neutral-600">{card.problem}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-neutral-700">
                          {dict.solutionLabel}:{' '}
                        </dt>
                        <dd className="inline text-neutral-600">{card.solution}</dd>
                      </div>
                      <div>
                        <dt className="inline font-medium text-neutral-700">{dict.whyLabel}: </dt>
                        <dd className="inline text-neutral-600">{card.why}</dd>
                      </div>
                    </dl>
                    <a
                      href={docUrl(card.file)}
                      target="_blank"
                      rel="noreferrer"
                      className={cardLink}
                    >
                      {card.ref} ↗
                    </a>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Угрозы → меры → где реализовано. */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{dict.securityTitle}</h2>
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
                {dict.securityRows.map((row) => (
                  <tr key={row.threat} className="align-top even:bg-neutral-50">
                    <td className="border-b border-neutral-200 px-3 py-2">{row.threat}</td>
                    <td className="border-b border-neutral-200 px-3 py-2 text-neutral-600">
                      {row.measure}
                    </td>
                    <td className="border-b border-neutral-200 px-3 py-2">
                      <a
                        href={docUrl(row.file)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-cyan-700 hover:opacity-80"
                      >
                        {row.where} ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Быстрые ссылки внутрь приложения. */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{dict.quickTitle}</h2>
          <p className="text-sm text-neutral-600">{dict.quickText}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {dict.quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:shadow-xs"
              >
                <span className="block font-medium text-neutral-900">{link.label} →</span>
                <span className="mt-1 block text-sm text-neutral-600">{link.note}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Границы демо-проекта. */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{dict.limitsTitle}</h2>
          <p className="max-w-[80ch] text-sm text-neutral-600">{dict.limitsText}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">
            {dict.limits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <a href={docUrl(dict.limitsFile)} target="_blank" rel="noreferrer" className={outbound}>
            {dict.limitsRef} ↗
          </a>
        </section>

        {/* Индекс документации репозитория. */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{dict.docsTitle}</h2>
          <p className="max-w-[80ch] text-sm text-neutral-600">{dict.docsText}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {dict.docsLinks.map((doc) => (
              <li key={doc.file}>
                <a
                  href={docUrl(doc.file)}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md border border-neutral-200 px-3 py-2 transition hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <span className="block font-mono text-xs text-cyan-700">{doc.file} ↗</span>
                  <span className="mt-0.5 block text-sm text-neutral-600">{doc.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
