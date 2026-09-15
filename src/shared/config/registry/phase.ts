export const PHASE_CONTROL_REGISTRY = {
  // --- АВТОМАТИЧЕСКИЕ ИДЕНТИФИКАТОРЫ ---
  // phase_order_id удалён из реестра: это системная колонка (номер фазы =
  // вставка по порядку), в матрице «№ фазы» не показывается — номер виден
  // в заголовке колонки («Фаза N»/«Поступление»/«Выписка»).
  phase_relative_id: {
    id: 'phase_relative_id',
    label: { ru: 'Тип точки', en: 'Point Type' },
    ui: 'badge-readonly', // Отображается как метка (1, 2, ..., 98, 99)
    scope: 'phase',
    // Системная колонка phases.phase_relative_id (см. d1-schema.ts): назначается
    // при создании фазы и НЕ редактируется из грида (только просмотр меткой).
    // Семантика: 1, 2, ... — обычные фазы (добавляются перед фазой 98 по порядку),
    // 98 — «Поступление», 99 — «Выписка». Заголовки колонок строит UI-слой матрицы.
  },

  // Основная дата начала
  phase_start_date: {
    id: 'phase_start_date',
    label: { ru: 'Дата начала фазы', en: 'Phase Start Date' },
    ui: 'date-picker',
    db_type: 'DATE',
    scope: 'phase',
    // Помогаем врачу: для 98/99 можно предлагать текущую дату
    // PII: абсолютная дата — в экспорт не попадает, заменяется
    // diffMonths от даты включения (см. docs/export.md).
    pii: true,
  },

  // --- ВРЕМЕННЫЕ ХАРАКТЕРИСТИКИ (Вводятся вручную) ---
  phase_duration_months: {
    id: 'phase_duration_months',
    label: { ru: 'Длительность фазы (мес)', en: 'Phase Duration (mo)' },
    ui: 'number-input',
    db_type: 'FLOAT',
    min: 0,
    scope: 'phase',
  },
  intermission_duration: {
    id: 'intermission_duration',
    label: { ru: 'Длительность интермиссии (мес)', en: 'Intermission Duration (mo)' },
    ui: 'number-input',
    db_type: 'FLOAT',
    min: 0,
    scope: 'phase',
  },
  episode_age: {
    id: 'episode_age',
    label: {
      ru: 'Возраст пациента (лет) на начало фазы',
      en: 'Patient Age (years) at Phase Start',
    },
    ui: 'number-readonly',
    calculate: 'phase_start_date - birth_year',
    scope: 'phase',
  },
}
