import Link from 'next/link'
import { getLocale, getDict } from '@/shared/lib/intl'
import { SiteHeader } from '@/widgets/site-header'

/**
 * Публичная страница `/about` (docs/ru/spec-public-1.md §2): сжатый
 * architecture-overview без БД — registry-core, CAS, виртуализация матрицы,
 * security-summary одной строкой, границы демо, ссылка на реферат.
 */
export default async function AboutPage() {
  const [locale, landing, about] = await Promise.all([
    getLocale(),
    getDict('landing'),
    getDict('about'),
  ])

  const blocks = [
    { title: about.registryTitle, text: about.registryText },
    { title: about.casTitle, text: about.casText },
    { title: about.virtualizationTitle, text: about.virtualizationText },
    { title: about.securityTitle, text: about.securityText },
  ]

  return (
    <div>
      <SiteHeader locale={locale} dict={landing} />
      <main className="mx-auto flex max-w-[1000px] flex-col gap-8 px-6 py-10">
        <section className="space-y-3">
          <h1 className="text-3xl font-bold">{about.title}</h1>
          <p className="text-neutral-600">{about.intro}</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {blocks.map((b) => (
            <div key={b.title} className="rounded-lg border border-neutral-200 p-4">
              <h2 className="font-semibold">{b.title}</h2>
              <p className="mt-1 text-sm text-neutral-600">{b.text}</p>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">{about.boundariesTitle}</h2>
          <p className="text-sm text-neutral-600">{about.boundariesText}</p>
        </section>

        <section className="flex flex-wrap gap-2">
          <a
            href={about.thesisUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
          >
            {about.thesisLink}
          </a>
          <a
            href={about.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
          >
            {about.docsLink}
          </a>
          <Link
            href="/"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
          >
            {about.backHome}
          </Link>
        </section>
      </main>
    </div>
  )
}
