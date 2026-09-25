/**
 * Глиф «крест» для колонки «Для врачей и исследователей» витрины
 * (docs/ru/spec-public-1.md §3 п.3). Инлайновый SVG: цвет — атрибут `fill`,
 * размер — `width`/`height`, чтобы глиф не зависел от свежести
 * сгенерированного Tailwind-слоя.
 */

export function IconCross() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <g transform="scale(1.18) translate(-8,-7)" fill="#cccccc">
        <path
          d="M 32 10
       H 68
       V 32
       H 90
       V 68
       H 68
       V 90
       H 32
       V 68
       H 10
       V 32
       H 32
       Z"
        />
        <path
          d="M 44 22
       H 56
       V 44
       H 78
       V 56
       H 56
       V 78
       H 44
       V 56
       H 22
       V 44
       H 44
       Z"
          fill="#ffffff"
        />
      </g>
    </svg>
  )
}
