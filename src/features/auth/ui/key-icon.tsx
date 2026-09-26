/**
 * Иконка «ключ» для ссылки на смену пароля в шапке. Инлайновый SVG (как
 * глифы витрины): размер — `width`/`height`, цвет — `currentColor`, чтобы
 * значок наследовал цвет ссылки и не зависел от свежести Tailwind-слоя.
 */
export function KeyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.7 12.3 21 2" />
      <path d="M17 6l3 3" />
      <path d="M14 9l3 3" />
    </svg>
  )
}
