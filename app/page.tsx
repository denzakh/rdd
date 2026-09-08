import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="grid min-h-screen grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 p-8 pb-20 font-sans sm:p-20">
      <main className="row-start-2 flex flex-col items-center gap-[32px] sm:items-start">
        <Link
          className="rounded-full border border-solid border-black/[.08] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[#f2f2f2] dark:border-white/[.145] dark:hover:bg-white/[.08]"
          href="/patients"
        >
          Пациенты регистра →
        </Link>
      </main>
    </div>
  )
}
