export const PHASE_CONTROL_REGISTRY = {
  // --- АВТОМАТИЧЕСКИЕ ИДЕНТИФИКАТОРЫ ---
  phase_order_id: {
    id: 'phase_order_id',
    label: { ru: '№ фазы', en: 'Phase Order #' },
    ui: 'number-readonly', // Врач видит, но не правит
    calculate: 'array_index + 1',
    scope: 'phase',
  },
  phase_relative_id: {
    id: 'phase_relative_id',
    label: { ru: 'Тип точки', en: 'Point Type' },
    ui: 'badge-readonly', // Отображается как метка (Анамнез/98/99)
    calculate: (index, total) => {
      if (index === total - 1) return 99
      if (index === total - 2) return 98
      return 1 // Анамнестическая
    },
    scope: 'phase',
  },

  // Основная дата начала
  phase_start_date: {
    id: 'phase_start_date',
    label: { ru: 'Дата начала фазы', en: 'Phase Start Date' },
    ui: 'date-picker',
    db_type: 'DATE',
    zod: 'z.date()',
    scope: 'phase',
    // Помогаем врачу: для 98/99 можно предлагать текущую дату
  },

  // --- ВРЕМЕННЫЕ ХАРАКТЕРИСТИКИ (Вводятся вручную) ---
  phase_duration_months: {
    id: 'phase_duration_months',
    label: { ru: 'Длительность фазы (мес)', en: 'Phase Duration (mo)' },
    ui: 'number-input',
    db_type: 'FLOAT',
    zod: 'z.number().nonnegative()',
    scope: 'phase',
  },
  intermission_duration: {
    id: 'intermission_duration',
    label: { ru: 'Длительность интермиссии (мес)', en: 'Intermission Duration (mo)' },
    ui: 'number-input',
    db_type: 'FLOAT',
    zod: 'z.number().nonnegative().nullable()',
    scope: 'phase',
  },
  episode_age: {
    id: 'episode_age',
    label: { ru: 'Возраст эпизода', en: 'Age at Episode' },
    ui: 'number-readonly',
    calculate: 'phase_start_date - birth_year',
    scope: 'phase',
  },
}
