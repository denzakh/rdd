import type { LandingDict } from '../model/landing-content'

/**
 * Футер витрины (docs/ru/spec-public-1.md §3 п.6): напоминание, что демо
 * наполнено синтетическими данными и не содержит реальных ПДн.
 */
export function LandingFooter({ dict }: { dict: LandingDict }) {
  return (
    <footer className="border-t border-neutral-200 pt-4 text-xs text-neutral-500">
      {dict.footerNote}
    </footer>
  )
}
