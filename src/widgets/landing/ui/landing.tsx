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

  return (
    <main className="mx-auto flex max-w-[1000px] flex-col gap-10 px-6 py-10">
      <section className="space-y-4">
        <span className="inline-block rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-600">
          {dict.badge}
        </span>
        <h1 className="text-3xl font-bold">{dict.title}</h1>
        <p className="text-neutral-600">{dict.subtitle}</p>
        <p className="text-sm text-neutral-500">{dict.domainNote}</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/login"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
          >
            {dict.login}
          </Link>
          <a
            href={dict.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
          >
            {dict.docs}
          </a>
          <a
            href={dict.thesisUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
          >
            {dict.thesis}
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.title}
            className="flex items-center gap-7 rounded-lg border border-neutral-200 px-6 py-4"
          >
            <div className="flex w-[100px] shrink-0 items-center justify-center text-neutral-400">
              <CardIcon src={c.icon} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">{c.title}</h2>
              <p className="mt-1 text-sm text-neutral-600">{c.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-lg bg-neutral-50 p-4">
        <h2 className="font-semibold">{dict.pipelineTitle}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">
          <li>{dict.pipeline1}</li>
          <li>{dict.pipeline2}</li>
          <li>{dict.pipeline3}</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">{dict.boundariesTitle}</h2>
        <p className="text-sm text-neutral-600">{dict.boundariesText}</p>
      </section>

      <section>
        <Image
          src={dict.diagramSrc}
          alt={dict.diagramAlt}
          width={1200}
          height={1585}
          unoptimized
          className="w-full rounded-lg border border-neutral-200"
        />
      </section>

      <footer className="border-t border-neutral-200 pt-4 text-xs text-neutral-500">
        {dict.footerNote}
      </footer>
    </main>
  )
}
