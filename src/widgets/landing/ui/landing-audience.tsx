import type { ReactNode } from 'react'
import { buildGoals, type LandingDict } from '../model/landing-content'
import { IconCross } from './icons/icon-cross'
import { IconMachine } from './icons/icon-machine'

/** Слот глифа цели: фиксированный квадрат 64×64 с приглушённой непрозрачностью. */
function GoalIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center opacity-70">{children}</div>
  )
}

/** Колонка аудитории: глиф + заголовок и список задач, которые она решает. */
function Goal({ title, icon, list }: { title: string; icon: ReactNode; list: string[] }) {
  return (
    <div className="space-y-1.5">
      <h3 className="flex items-center gap-4">
        <GoalIcon>{icon}</GoalIcon>
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
 * Блок «Для кого и какую задачу решает система» (docs/ru/spec-public-1.md §3):
 * две колонки — врачи/исследователи и наниматели/техлиды.
 */
export function LandingAudience({ dict }: { dict: LandingDict }) {
  const { doctors, tech } = buildGoals(dict)

  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-6">
      <h2 className="text-sm font-semibold tracking-wider text-neutral-500 uppercase">
        {dict.targetAudienceTitle}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">
        <Goal title={doctors.title} icon={<IconCross />} list={doctors.list} />
        <Goal title={tech.title} icon={<IconMachine />} list={tech.list} />
      </div>
    </section>
  )
}
