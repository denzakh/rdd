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

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader locale={locale} dict={landing} />

      <main className="mx-auto flex max-w-[1000px] flex-col gap-10 px-6 py-12">
        {/* Intro */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full border border-neutral-300 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700">
              {landing.badge}
            </span>
            <span className="inline-block rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-800">
              Senior / Staff Architecture Showcase
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
            {about.title}
          </h1>

          <p className="text-base leading-relaxed text-neutral-700 sm:text-lg">{about.intro}</p>
        </header>

        {/* 1. Clinical Context */}
        <section className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50/60 p-6">
          <h2 className="text-xl font-bold text-neutral-900">{about.clinicalSectionTitle}</h2>
          <p className="text-sm leading-relaxed text-neutral-700">{about.clinicalBackground}</p>

          <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-neutral-900">{about.clinicalProblemTitle}</h3>
            <p className="text-sm leading-relaxed text-neutral-600">{about.clinicalProblemText}</p>
          </div>
        </section>

        {/* 2. Registry-Driven Core (SSOT) */}
        <section className="space-y-4 rounded-xl border border-neutral-200 p-6">
          <h2 className="text-xl font-bold text-neutral-900">{about.archSectionTitle}</h2>
          <p className="text-sm leading-relaxed text-neutral-700">{about.archRegistryText}</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                {about.archPoint1Label}
              </span>
              <p className="text-xs leading-relaxed text-neutral-700">{about.archRegistryPoint1}</p>
            </div>
            <div className="space-y-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                {about.archPoint2Label}
              </span>
              <p className="text-xs leading-relaxed text-neutral-700">{about.archRegistryPoint2}</p>
            </div>
            <div className="space-y-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                {about.archPoint3Label}
              </span>
              <p className="text-xs leading-relaxed text-neutral-700">{about.archRegistryPoint3}</p>
            </div>
          </div>
        </section>

        {/* 3. Matrix Grid */}
        <section className="space-y-4 rounded-xl border border-neutral-200 p-6">
          <h2 className="text-xl font-bold text-neutral-900">{about.matrixSectionTitle}</h2>
          <p className="text-sm leading-relaxed text-neutral-700">{about.matrixText}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 rounded-lg border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-neutral-900">{about.matrixPoint1Label}</h3>
              <p className="text-xs leading-relaxed text-neutral-600">{about.matrixPoint1}</p>
            </div>
            <div className="space-y-1 rounded-lg border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-neutral-900">{about.matrixPoint2Label}</h3>
              <p className="text-xs leading-relaxed text-neutral-600">{about.matrixPoint2}</p>
            </div>
            <div className="space-y-1 rounded-lg border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-neutral-900">{about.matrixPoint3Label}</h3>
              <p className="text-xs leading-relaxed text-neutral-600">{about.matrixPoint3}</p>
            </div>
            <div className="space-y-1 rounded-lg border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-neutral-900">{about.matrixPoint4Label}</h3>
              <p className="text-xs leading-relaxed text-neutral-600">{about.matrixPoint4}</p>
            </div>
          </div>
        </section>

        {/* 4. Edge Infrastructure and Security */}
        <section className="space-y-4 rounded-xl border border-neutral-200 p-6">
          <h2 className="text-xl font-bold text-neutral-900">{about.edgeSectionTitle}</h2>
          <p className="text-sm leading-relaxed text-neutral-700">{about.edgeText}</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1 rounded-lg border border-neutral-200 bg-neutral-50/70 p-4">
              <h3 className="text-sm font-semibold text-neutral-900">Web Crypto API</h3>
              <p className="text-xs leading-relaxed text-neutral-600">{about.edgeCryptoText}</p>
            </div>
            <div className="space-y-1 rounded-lg border border-neutral-200 bg-neutral-50/70 p-4">
              <h3 className="text-sm font-semibold text-neutral-900">Row-Level Access</h3>
              <p className="text-xs leading-relaxed text-neutral-600">{about.edgeRlsText}</p>
            </div>
            <div className="space-y-1 rounded-lg border border-neutral-200 bg-neutral-50/70 p-4">
              <h3 className="text-sm font-semibold text-neutral-900">Hash-Chain Audit</h3>
              <p className="text-xs leading-relaxed text-neutral-600">{about.edgeAuditText}</p>
            </div>
          </div>
        </section>

        {/* 5. Boundaries and Production Readiness */}
        <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-6">
          <h2 className="text-xl font-bold text-amber-950">{about.boundariesSectionTitle}</h2>
          <p className="text-sm leading-relaxed text-amber-900">{about.boundariesIntro}</p>

          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <div className="space-y-1 rounded-lg border border-amber-200 bg-white/80 p-4">
              <h3 className="text-sm font-semibold text-amber-950">
                {about.boundariesScope1Label}
              </h3>
              <p className="text-xs leading-relaxed text-amber-900">{about.boundariesScope1}</p>
            </div>
            <div className="space-y-1 rounded-lg border border-amber-200 bg-white/80 p-4">
              <h3 className="text-sm font-semibold text-amber-950">
                {about.boundariesScope2Label}
              </h3>
              <p className="text-xs leading-relaxed text-amber-900">{about.boundariesScope2}</p>
            </div>
          </div>
        </section>

        {/* 6. External Links & CTA */}
        <section className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 pt-6">
          <div className="flex flex-wrap gap-2">
            <a
              href={about.thesisUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              {about.thesisLink} ↗
            </a>
            <a
              href={about.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              {about.docsLink} ↗
            </a>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              {about.backHome}
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              {about.openDemo}
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
