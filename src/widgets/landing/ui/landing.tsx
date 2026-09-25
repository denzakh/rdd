import type { LandingDict } from '../model/landing-content'
import { LandingHero } from './landing-hero'
import { LandingAudience } from './landing-audience'
import { LandingCapabilities } from './landing-capabilities'
import { LandingHighlights } from './landing-highlights'
import { LandingBoundaries } from './landing-boundaries'
import { LandingFooter } from './landing-footer'

/**
 * Публичная витрина (docs/ru/spec-public-1.md §3): hero + CTA, «для кого
 * и какую задачу решает система», 4 карточки возможностей, ключевые
 * инженерные решения, границы демо, футер про synthetic data.
 *
 * Только композиция: секции — приватные компоненты этого же слайса (`ui/`),
 * контент из словаря собирает `model/landing-content`. Без БД и сессии —
 * единственный вход, это словарь локали.
 */
export function Landing({ dict }: { dict: LandingDict }) {
  return (
    <main className="mx-auto flex max-w-[1000px] flex-col gap-10 px-6 py-10">
      <LandingHero dict={dict} />
      <LandingAudience dict={dict} />
      <LandingCapabilities dict={dict} />
      <LandingHighlights dict={dict} />
      <LandingBoundaries dict={dict} />
      <LandingFooter dict={dict} />
    </main>
  )
}
