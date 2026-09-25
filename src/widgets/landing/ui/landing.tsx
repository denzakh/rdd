import Image from 'next/image'
import Link from 'next/link'
import type { Namespaces } from '@/shared/lib/intl'
import { distDir } from 'vitest/node'

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

function GoalIcon(icon) {
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center opacity-70">{icon}</div>
  )
}

const iconCross = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <g transform="scale(1.18) translate(-8,-7)" fill="#cccccc">
      <path
        d="M 32 10
       H 68
       V 32
       H 90
       V 68
       H 68
       V 90
       H 32
       V 68
       H 10
       V 32
       H 32
       Z"
      />
      <path
        d="M 44 22
       H 56
       V 44
       H 78
       V 56
       H 56
       V 78
       H 44
       V 56
       H 22
       V 44
       H 44
       Z"
        fill="#ffffff"
      />
    </g>
  </svg>
)

const IconMachine = (
  <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1280" viewBox="0 0 1280 1280">
    <g transform="translate(0,1280) scale(0.1,-0.1)" fill="#cccccc">
      <path d="M5385 12786c-92-29-158-87-199-175-21-45-21-56-24-687l-3-640-102-29c-388-108-835-298-1166-495l-85-51-465 465c-439 437-469 465-521 482-82 27-173 23-246-10-53-24-130-98-730-699-746-747-718-714-719-847 0-142-17-120 494-633l456-458-24-42c-132-236-243-467-329-682-59-148-154-435-189-570l-18-70-640-5-640-5-57-28c-65-32-121-89-152-156l-21-46 0-1005 0-1005 28-57c32-65 89-121 156-152 45-21 56-21 691-24l645-3 43-151c104-365 300-824 477-1112l44-71-57-60c-31-33-179-184-327-335-610-619-580-582-580-725 1-63 6-90 24-130 19-40 160-187 695-722 460-460 685-678 714-692 90-45 197-47 290-5 23 11 208 188 497 476l461 458 114-65c328-187 711-348 1077-453l162-47 3-645c3-635 3-646 24-691 31-67 87-124 152-156l57-28 1005 0 1005 0 57 28c65 32 121 89 152 156 21 45 21 56 24 687l3 642 62 17c408 111 818 282 1186 493l114 65 456-460c514-519 499-507 636-507 63 0 91 5 130 23 73 34 1390 1352 1426 1426 34 71 34 200 0 265-15 30-174 197-482 506l-460 460 56 95c85 142 235 454 308 639 66 166 148 414 182 547l19 72 645 3c636 3 647 3 692 24 67 31 124 87 156 152l28 57 0 1005 0 1005-28 57c-32 65-89 121-156 152-45 21-56 21-687 24l-642 3-11 44c-91 360-280 819-490 1185l-71 124 464 466c520 521 502 498 500 640-1 134 23 106-722 852-595 595-673 670-726 694-73 33-164 37-246 10-52-17-82-45-520-482l-466-464-114 66c-326 187-741 360-1117 465l-122 34-3 645c-3 637-3 646-25 692-30 66-95 132-156 159l-52 24-990 2c-779 1-999-1-1030-11z m1160-4527c580-49 1087-347 1410-829 71-106 174-315 215-438 220-653 55-1381-425-1881-557-580-1414-740-2135-400-392 186-696 485-885 874-110 224-163 422-185 680-14 162-1 345 35 520 166 798 849 1403 1665 1474 137 12 171 12 305 0z" />
    </g>
    <circle cx="640" cy="640" r="300" fill="#fafafa" />
  </svg>
)

function Goal({ title, icon, list }: { title: string; icon: React.ReactNode; list: string[] }) {
  return (
    <div className="space-y-1.5">
      <h3 className="flex items-center gap-4">
        {GoalIcon(icon)}
        <span className="text-xl font-semibold text-neutral-700">{title}</span>
      </h3>
      <ul className="mt-4 text-sm leading-relaxed text-neutral-600">
        {list.map((item, index) => (
          <li key={index} className="list-inside list-disc">
            {item}
          </li>
        ))}
      </ul>
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
    {
      title: dict.highlightRegistryTitle,
      text1: dict.highlightRegistryText1,
      text2: dict.highlightRegistryText2,
    },
    {
      title: dict.highlightMatrixTitle,
      text1: dict.highlightMatrixText1,
      text2: dict.highlightMatrixText2,
    },
    {
      title: dict.highlightEdgeTitle,
      text1: dict.highlightEdgeText1,
      text2: dict.highlightEdgeText2,
    },
  ]

  return (
    <main className="mx-auto flex max-w-[1000px] flex-col gap-10 px-6 py-10">
      {/* 1. Hero Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-block rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800">
            Next.js 16 · Cloudflare Workers · D1 SQLite
          </span>
          <span className="inline-block rounded-full bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700">
            {dict.badge}
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
      <section className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
        <h2 className="text-sm font-semibold tracking-wider text-neutral-500 uppercase">
          {dict.targetAudienceTitle}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <Goal title={dict.forDoctors.title} icon={iconCross} list={dict.forDoctors.list} />
          <Goal title={dict.forTech.title} icon={IconMachine} list={dict.forTech.list} />
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
              <p className="text-xs leading-relaxed text-neutral-600">{h.text1}</p>
              <p className="text-xs leading-relaxed text-neutral-600">{h.text2}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Demo Boundaries */}
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
