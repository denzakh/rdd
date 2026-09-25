import { buildCards, type LandingDict } from '../model/landing-content'

/**
 * Глиф карточки: SVG из `public/images` как CSS-маска — глиф окрашивается в
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
 * Блок «Возможности регистра» (docs/ru/spec-public-1.md §3 п.3): 4 карточки —
 * паспорт, матрица фаз, аналитика/экспорт, словарь терминов.
 */
export function LandingCapabilities({ dict }: { dict: LandingDict }) {
  const cards = buildCards(dict)

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-neutral-900">{dict.capabilitiesTitle}</h2>
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
  )
}
