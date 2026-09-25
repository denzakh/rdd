import Link from 'next/link'
import type { LandingDict } from '../model/landing-content'

/**
 * Бейдж стека в hero: это не текст для локализации, а факт платформы,
 * поэтому не живёт в словаре (docs/ru/spec-public-1.md §3 п.1).
 */
const STACK_BADGE = 'Next.js 16 · Cloudflare Workers · D1 SQLite'

/**
 * Hero витрины (docs/ru/spec-public-1.md §3 п.1–2): бейджи, заголовок,
 * подзаголовок, дисклеймер о происхождении модели данных и CTA-кнопки
 * (`Войти`, `О проекте`, документация и реферат на GitHub).
 */
export function LandingHero({ dict }: { dict: LandingDict }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-block rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800">
          {STACK_BADGE}
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
  )
}
