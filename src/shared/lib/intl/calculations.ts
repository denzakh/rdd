/**
 * Расчет разницы в полных годах между двумя датами по стандарту Intl
 */
export const diffYears = (
  dateStart: string | Date | number,
  dateEnd: string | Date | number
): number => {
  const start = new Date(dateStart)
  const end = new Date(dateEnd)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0

  let years = end.getFullYear() - start.getFullYear()
  const monthDiff = end.getMonth() - start.getMonth()

  // Корректировка, если текущий месяц/день еще не наступил в году окончания
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < start.getDate())) {
    years--
  }

  return years > 0 ? years : 0
}

/**
 * Расчет разницы в полных месяцах (для длительности фаз)
 */
export const diffMonths = (dateStart: string | Date, dateEnd: string | Date): number => {
  const start = new Date(dateStart)
  const end = new Date(dateEnd)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0

  let months = (end.getFullYear() - start.getFullYear()) * 12
  months += end.getMonth() - start.getMonth()

  // Если день месяца окончания меньше дня начала, месяц еще не "закрыт"
  if (end.getDate() < start.getDate()) {
    months--
  }

  return months > 0 ? months : 0
}

/**
 * Пример функции для определения возрастной группы с использованием Intl
 * (для единообразного форматирования чисел, если нужно)
 */
export const getAgeGroup = (age: number): number => {
  if (age < 50) return 1
  if (age < 60) return 2
  if (age < 70) return 3
  if (age < 80) return 4
  return 5
}

/**
 * Алиас для использования в реестре пациента (`patient.ts`):
 * маппинг возраста (полных лет) в возрастную группу 1..5.
 */
export const map_age_to_group = getAgeGroup
