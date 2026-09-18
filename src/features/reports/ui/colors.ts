/**
 * Палитры секторных диаграмм `/reports`: значение признака реестра → hex-цвет.
 * Hex, а не классы Tailwind (`fill-*`), — чтобы заливка секторов не зависела
 * от JIT-сканера CSS: значение попадает в атрибут `fill` прямо в разметке.
 */
export type SliceColors = Record<number, string>

/** Палитра по умолчанию (тяжесть/компонент): 1 — лёгкая, 2 — умеренная, 3 — тяжёлая. */
export const DEFAULT_COLORS: SliceColors = {
  0: '#a3a3a3', // neutral-400 — «Отсутствует»
  1: '#9ae600', // green-300
  2: '#fbbf24', // amber-400
  3: '#ff6467', // red-400
  5: '#00bcff', // sky-400
  6: '#c27aff', // purple-400
}

/** Цвет сектора для значения, которого нет в палитре. */
export const FALLBACK_COLOR = '#737373' // neutral-500

/** Пол: мужчины — синий, женщины — фиолетовый. */
export const GENDER_COLORS: SliceColors = {
  1: '#74d4ff', // sky-300
  2: 'rgb(252, 165, 165)', // red-300
}

/** Сезонность обострений: зима — синий, весна — зелёный, лето — жёлтый, осень — оранжевый. */
export const SEASON_COLORS: SliceColors = {
  1: '#a3b3ff', // blue-600 — зима
  2: '#bbf451', // lime-300 — весна
  3: '#05df72', // teal-300 — лето
  4: '#ffb86a', // orange-300 — осень
}
