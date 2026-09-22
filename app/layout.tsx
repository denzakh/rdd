import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { getLocale } from '@/shared/lib/intl'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

/**
 * Метаданные витрины (docs/ru/spec-public-2.md §1 п.5): title и description под
 * текущую локаль (`getLocale()`), description — первая строка README. OpenGraph
 * минимальный, без картинок и без операционных деталей.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const en = locale === 'en'

  const title = en
    ? 'RDD — Depressive Disorders Registry'
    : 'RDD — Регистр депрессивных расстройств'
  const description = en
    ? 'Clinical registry web app: patient passport, disease-phase matrix, roles, audit and authentication.'
    : 'Веб-приложение клинического регистра: паспорт пациента, матрица фаз заболевания, роли, аудит и аутентификация.'

  return {
    title,
    description,
    openGraph: { title, description, siteName: 'RDD', type: 'website' },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()

  return (
    <html lang={locale}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  )
}
