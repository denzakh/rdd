/**
 * View-модель витрины: словарь локали → плоские структуры для рендера
 * (docs/ru/spec-public-1.md §3 п.3–4). Живёт в `model`, поэтому `ui`-секции
 * остаются презентационными и не собирают контент внутри разметки.
 */
import type { Namespaces } from '@/shared/lib/intl'

/** Словарь неймспейса `landing` — единственный входной проп витрины. */
export type LandingDict = Namespaces['landing']

/** Карточка блока «Возможности регистра»: текст из словаря + URL глифа. */
export type LandingCard = {
  title: string
  text: string
  /** Глиф из `public/images`; рисуется CSS-маской (`mask-image`), поэтому URL, а не `<img>`. */
  icon: string
}

/** Пункт блока «Ключевые инженерные решения»: заголовок и два абзаца. */
export type LandingHighlight = {
  title: string
  text1: string
  text2: string
}

/** Цель одной аудитории в блоке «Для кого…»: заголовок и список пунктов. */
export type LandingGoal = {
  title: string
  list: string[]
}

/** 4 карточки возможностей; порядок и глифы зафиксированы в спеке. */
export function buildCards(dict: LandingDict): LandingCard[] {
  return [
    { title: dict.cardPassportTitle, text: dict.cardPassportText, icon: '/images/patient.svg' },
    { title: dict.cardMatrixTitle, text: dict.cardMatrixText, icon: '/images/matrix.svg' },
    { title: dict.cardReportsTitle, text: dict.cardReportsText, icon: '/images/report.svg' },
    { title: dict.cardDictionaryTitle, text: dict.cardDictionaryText, icon: '/images/journal.svg' },
  ]
}

/** 3 инженерных блока: registry-core (SSOT), виртуализированная матрица, edge-стек. */
export function buildHighlights(dict: LandingDict): LandingHighlight[] {
  return [
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
}

/** Две аудитории витрины: врачи-исследователи и наниматели/техлиды. */
export function buildGoals(dict: LandingDict): { doctors: LandingGoal; tech: LandingGoal } {
  return {
    doctors: { title: dict.forDoctors.title, list: dict.forDoctors.list },
    tech: { title: dict.forTech.title, list: dict.forTech.list },
  }
}
