/**
 * Палитры секторных диаграмм `/reports`: значение признака реестра → hex-цвет.
 * Hex, а не классы Tailwind (`fill-*`), — чтобы заливка секторов не зависела
 * от JIT-сканера CSS: значение попадает в атрибут `fill` прямо в разметке.
 */
export type SliceColors = Record<number, string>

/** Палитра по умолчанию (тяжесть/компонент): 1 — лёгкая, 2 — умеренная, 3 — тяжёлая. */
export const DEFAULT_COLORS: SliceColors = {
  0: '#a3a3a3', // neutral-400 — «Отсутствует»
  1: '#16a34a', // green-600
  2: '#fbbf24', // amber-400
  3: '#dc2626', // red-600
  5: '#2563eb', // blue-600
  6: '#9333ea', // purple-600
}

/** Цвет сектора для значения, которого нет в палитре. */
export const FALLBACK_COLOR = '#737373' // neutral-500

/** Пол: мужчины — синий, женщины — фиолетовый. */
export const GENDER_COLORS: SliceColors = {
  1: '#2563eb', // blue-600
  2: '#9333ea', // purple-600
}

/** Сезонность обострений: зима — синий, весна — зелёный, лето — жёлтый, осень — оранжевый. */
export const SEASON_COLORS: SliceColors = {
  1: '#2563eb', // blue-600 — зима
  2: '#16a34a', // green-600 — весна
  3: '#fbbf24', // amber-400 — лето
  4: '#ea580c', // orange-600 — осень
}
