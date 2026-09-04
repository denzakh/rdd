/**
 * Форматирование даты в строку по стандарту Intl
 */
export const formatDate = (date: string | Date | number, locale: 'ru-RU' | 'en-US' = 'ru-RU') => {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}
