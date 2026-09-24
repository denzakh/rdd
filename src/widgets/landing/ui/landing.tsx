import Image from 'next/image'
import Link from 'next/link'
import type { Namespaces } from '@/shared/lib/intl'

type LandingDict = Namespaces['landing']

/**
 * Иконка карточки: SVG из `public/images` как CSS-маска — глиф окрашивается в
 * `currentColor`, поэтому наследует цвет блока-родителя. Через `<img>` цвет бы
 * не наследовался (внутри SVG `fill="currentColor"` разрешается в чёрный).
 * Размер и свойства маски заданы инлайном: так иконка не зависит от свежести
 * сгенерированного Tailwind-слоя и не схлопывается в ноль (aspect-ratio + width).
 * Канвас SVG — `2816×1536`, глиф в нём центрирован.
 */
function CardIcon({ src }: { src: string }) {
  return (
    <div className="ov relative h-[120px] w-[100px] text-[currentColor]">
      <span
        aria-hidden="true"
        className="absolute top-0 left-[50%] block h-full translate-x-[-50%] text-neutral-400"
        style={{
          display: 'block',
          aspectRatio: '2816 / 1536',
          backgroundColor: 'currentColor',
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
        }}
      />
    </div>
  )
}

/**
 * Публичный лендинг (docs/ru/spec-public-1.md §3): hero, CTA, 4 карточки,
 * блок Registry → D1/Zod/UI, границы демо, C4-диаграмма, футер про synthetic data.
 * Без БД и без сессии — только словарь локали.
 */
export function Landing({ dict }: { dict: LandingDict }) {
  const cards: Array<{ title: string; text: string; icon: string }> = [
    { title: dict.cardPassportTitle, text: dict.cardPassportText, icon: '/images/patient.svg' },
    { title: dict.cardMatrixTitle, text: dict.cardMatrixText, icon: '/images/matrix.svg' },
    { title: dict.cardReportsTitle, text: dict.cardReportsText, icon: '/images/report.svg' },
    { title: dict.cardDictionaryTitle, text: dict.cardDictionaryText, icon: '/images/journal.svg' },
  ]

  const highlights = [
    { title: dict.highlightRegistryTitle, text: dict.highlightRegistryText },
    { title: dict.highlightMatrixTitle, text: dict.highlightMatrixText },
    { title: dict.highlightEdgeTitle, text: dict.highlightEdgeText },
  ]

  return (
    <main className="mx-auto flex max-w-[1000px] flex-col gap-10 px-6 py-10">
      {/* 1. Hero Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-block rounded-full border border-neutral-300 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700">
            {dict.badge}
          </span>
          <span className="inline-block rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800">
            Next.js 16 · Cloudflare Workers · D1 SQLite
          </span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
          {dict.title}
        </h1>

        <p className="text-base leading-relaxed text-neutral-700 sm:text-lg">{dict.subtitle}</p>

        <p className="border-l-2 border-neutral-300 pl-3 text-sm text-neutral-500 italic">
          {dict.domainNote}
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            href="/login"
            className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            {dict.login}
          </Link>
          <Link
            href="/about"
            className="rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            {dict.about}
          </Link>
          <a
            href={dict.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            {dict.docs} ↗
          </a>
          <a
            href={dict.thesisUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            {dict.thesis} ↗
          </a>
        </div>
      </section>

      {/* 2. Target Audience */}
      <section className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50/70 p-6">
        <h2 className="text-sm font-semibold tracking-wider text-neutral-500 uppercase">
          {dict.targetAudienceTitle}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <h3 className="flex items-center gap-2 font-semibold text-neutral-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                MD
              </span>
              {dict.forDoctorsTitle}
            </h3>
            <p className="text-sm leading-relaxed text-neutral-600">{dict.forDoctorsText}</p>
          </div>
          <div className="space-y-1.5">
            <h3 className="flex items-center gap-2 font-semibold text-neutral-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                TS
              </span>
              {dict.forTechTitle}
            </h3>
            <p className="text-sm leading-relaxed text-neutral-600">{dict.forTechText}</p>
          </div>
        </div>
      </section>

      {/* 3. Core Functional Capabilities */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-neutral-900">Возможности регистра</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <div
              key={c.title}
              className="flex items-center gap-6 rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-300 hover:shadow-xs"
            >
              <div className="flex w-[100px] shrink-0 items-center justify-center">
                <CardIcon src={c.icon} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-neutral-900">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-normal text-neutral-600">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Engineering Highlights */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-neutral-900">{dict.techHighlightsTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {highlights.map((h) => (
            <div
              key={h.title}
              className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/50 p-5"
            >
              <h3 className="text-sm font-semibold text-neutral-900">{h.title}</h3>
              <p className="text-xs leading-relaxed text-neutral-600">{h.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. C4 Architecture Overview */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-neutral-900">{dict.diagramTitle}</h2>
          <Link href="/about" className="text-xs font-medium text-cyan-700 hover:underline">
            {dict.about} →
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white p-2">
          <Image
            src={dict.diagramSrc}
            alt={dict.diagramAlt}
            width={1200}
            height={1585}
            unoptimized
            className="w-full rounded-lg"
          />
        </div>
      </section>

      {/* 6. Demo Boundaries */}
      <section className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50/50 p-5">
        <h3 className="text-sm font-semibold text-amber-900">{dict.boundariesTitle}</h3>
        <p className="text-xs leading-relaxed text-amber-800">{dict.boundariesText}</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 pt-4 text-xs text-neutral-500">
        {dict.footerNote}
      </footer>
    </main>
  )
}
