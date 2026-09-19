export const REMISSION_REGISTRY = {
  // Признаки патологии в ремиссии (0 - нет, 1 - да)
  subdepression_const: {
    id: 'subdepression_const',
    label: {
      ru: 'Постоянная субдепрессия',
      en: 'Persistent Subdepression',
    },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    scope: 'phase', // Характеризует выход из текущей фазы
  },
  affective_lability_rem: {
    id: 'affective_lability_rem',
    label: { ru: 'Афф. колебания', en: 'Affective Fluctuations (Rem)' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    scope: 'phase',
  },
  anxiety_lability_rem: {
    id: 'anxiety_lability_rem',
    label: { ru: 'Трев. колебания', en: 'Anxiety Fluctuations (Rem)' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    scope: 'phase',
  },

  // Дополнительные факторы
  unfavorable_env: {
    id: 'unfavorable_env',
    label: {
      ru: 'Неблагоприятная обстановка',
      en: 'Unfavorable Environment',
    },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    scope: 'phase',
  },
  pain_in_remission: {
    id: 'pain_in_remission',
    label: { ru: 'Боль в ремиссии', en: 'Pain in Remission' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    scope: 'phase',
  },

  // ВЫЧИСЛЯЕМОЕ ПОЛЕ
  pure_remission: {
    id: 'pure_remission',
    label: { ru: 'Чистая ремиссия', en: 'Pure Remission' },
    ui: 'badge-readonly',
    db_type: 'BOOLEAN',
    // Итог трёх чекбоксов выше: в матрице-гриде не нужен отдельной строкой
    // (значение видно в словаре/экспорте через applyComputed).
    hide_in_matrix: true,
    // Логика: если сумма признаков патологии > 0, то ремиссия не чистая (0)
    calculate: (data: Record<string, any>) => {
      const sum =
        Number(data.subdepression_const) +
        Number(data.affective_lability_rem) +
        Number(data.anxiety_lability_rem)
      return sum === 0 ? 1 : 0
    },
    scope: 'phase',
  },

  // Фактологические данные о лечении в интермиссии
  treatment_in_remission: {
    id: 'treatment_in_remission',
    label: { ru: 'Лечение в ремиссии', en: 'Treatment in Remission' },
    ui: 'toggle-binary',
    db_type: 'BOOLEAN',
    scope: 'phase',
  },

  prophylaxis_type: {
    id: 'prophylaxis_type',
    label: { ru: 'Тип профилактики', en: 'Prophylaxis Type' },
    ui: 'select',
    db_type: 'INTEGER',
    options: [
      { value: 0, label: { ru: 'Нет', en: 'None' } },
      { value: 1, label: { ru: 'Антидепрессанты', en: 'Antidepressants' } },
      { value: 2, label: { ru: 'Нормотимики', en: 'Mood stabilizers' } },
      { value: 3, label: { ru: 'Комбинированная', en: 'Combined' } },
    ],
    scope: 'phase',
    // Условная видимость (treatment_in_remission === true) будет реализована
    // в UI-слое; здесь — только декларация поля.
  },
}
