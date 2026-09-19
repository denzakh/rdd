export const DIAGNOSTIC_SCALES_REGISTRY = {
  // Шкала Гамильтона
  hamd_total: {
    id: 'hamd_total',
    label: { ru: 'Общий балл шкалы Гамильтона', en: 'HAM-D total score' },
    ui: 'number-input',
    db_type: 'INTEGER',
    is_current_only: true, // Поле доступно только для 98 и 99
    min: 0,
    max: 52,
    scope: 'phase',
  },
  hamd_severity: {
    id: 'hamd_severity',
    label: { ru: 'Выраженность депрессии (HAM-D)', en: 'Depression severity (HAM-D)' },
    ui: 'badge-readonly',
    db_type: 'INTEGER',
    is_current_only: true,
    scope: 'phase',
    // Интерпретация балла hamd_total: в матрице рядом с баллом избыточна
    // (значение видно в словаре/экспорте через applyComputed).
    hide_in_matrix: true,
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
      { value: 1, label: { ru: 'Отсутствует (0-7)', en: 'Absent (0-7)' } },
      { value: 2, label: { ru: 'Легкая (8-14)', en: 'Mild (8-14)' } },
      { value: 3, label: { ru: 'Умеренная (15-27)', en: 'Moderate (15-27)' } },
      { value: 4, label: { ru: 'Тяжелая (>27)', en: 'Severe (>27)' } },
    ],
  },

  // Другие шкалы
  beck_total: {
    id: 'beck_total',
    label: { ru: 'Шкала Бека', en: 'Beck Depression Inventory (BDI)' },
    ui: 'number-input',
    db_type: 'INTEGER',
    is_current_only: true,
    min: 0,
    max: 63,
    scope: 'phase',
  },
  clock_drawing_test: {
    id: 'clock_drawing_test',
    label: { ru: 'Тест рисования часов', en: 'Clock-Drawing Test' },
    ui: 'number-input',
    db_type: 'INTEGER',
    is_current_only: true,
    min: 0,
    max: 10,
    scope: 'phase',
  },
  mmse_total: {
    id: 'mmse_total',
    label: { ru: 'Общий балл MMSE', en: 'MMSE total score' },
    ui: 'number-input',
    db_type: 'INTEGER',
    is_current_only: true,
    min: 0,
    max: 30,
    scope: 'phase',
  },
}
