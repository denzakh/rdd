export const DIAGNOSTIC_SCALES_REGISTRY = {
  // Шкала Гамильтона
  hamd_total: {
    id: 'hamd_total',
    label: 'Общий балл шкалы Гамильтона',
    ui: 'number-input',
    db_type: 'INTEGER',
    is_current_only: true, // Поле доступно только для 98 и 99
    min: 0,
    max: 52,
    scope: 'phase',
  },
  hamd_severity: {
    id: 'hamd_severity',
    label: 'Выраженность депрессии (HAM-D)',
    ui: 'badge-readonly',
    db_type: 'INTEGER',
    is_current_only: true,
    scope: 'phase',
    // Единый контракт: принимает объект строки, читает hamd_total.
    calculate: (row: Record<string, unknown>) => {
      const score = row.hamd_total as number | null | undefined
      if (score === null || score === undefined) return null
      if (score <= 7) return 1 // Отсутствует
      if (score <= 14) return 2 // Легкая
      if (score <= 27) return 3 // Умеренная
      return 4 // Тяжелая
    },
    options: [
      { value: 1, label: 'Отсутствует (0-7)' },
      { value: 2, label: 'Легкая (8-14)' },
      { value: 3, label: 'Умеренная (15-27)' },
      { value: 4, label: 'Тяжелая (>27)' },
    ],
  },

  // Другие шкалы
  beck_total: {
    id: 'beck_total',
    label: 'Шкала Бека',
    ui: 'number-input',
    db_type: 'INTEGER',
    is_current_only: true,
    min: 0,
    max: 63,
    scope: 'phase',
  },
  clock_drawing_test: {
    id: 'clock_drawing_test',
    label: 'Тест рисования часов',
    ui: 'number-input',
    db_type: 'INTEGER',
    is_current_only: true,
    min: 0,
    max: 10,
    scope: 'phase',
  },
  mmse_total: {
    id: 'mmse_total',
    label: 'Общий балл MMSE',
    ui: 'number-input',
    db_type: 'INTEGER',
    is_current_only: true,
    min: 0,
    max: 30,
    scope: 'phase',
  },
}
