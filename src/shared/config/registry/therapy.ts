/**
 * РЕГИСТР: БЛОК ФАРМАКОТЕРАПИИ
 * Описывает лечение для каждой фазы (от 1 до 99)
 */

/**
 * Логические подгруппы секции therapy (Вариант A, subheader в матрице).
 * Реестр остаётся плоским: поле `group` у RegistryField — только ссылка
 * на ключ этого словаря, используется для отображения (матрица, словарь).
 */
export const THERAPY_GROUPS = {
  depressogenic: { ru: 'Депрессогенный фон', en: 'Depressogenic background', order: 0 },
  somatic: { ru: 'Соматическая поддержка', en: 'Somatic support', order: 1 },
  ad_classes: { ru: 'Антидепрессанты: классы', en: 'Antidepressant classes', order: 2 },
  ad_course: { ru: 'Курс АД: доза, путь, эффект', en: 'AD course: dose, route, effect', order: 3 },
  nl_trank: {
    ru: 'Нейролептики и транквилизаторы',
    en: 'Antipsychotics & tranquilizers',
    order: 4,
  },
} as const

export type TherapyGroupId = keyof typeof THERAPY_GROUPS

export const THERAPY_REGISTRY = {
  // --- 1а. ДЕПРЕССОГЕННЫЙ ФОН (0 - нет, 1 - да) ---

  beta_blockers: {
    id: 'beta_blockers',
    label: { ru: 'Бета-блокаторы', en: 'Beta blockers' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'depressogenic',
  },
  ca_blockers: {
    id: 'ca_blockers',
    label: { ru: 'Блокаторы Са', en: 'Ca-channel blockers' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'depressogenic',
  },
  other_depressogenic: {
    id: 'other_depressogenic',
    label: { ru: 'Другие депрессогенные', en: 'Other depressogenic drugs' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'depressogenic',
  },
  vitamins: {
    id: 'vitamins',
    label: { ru: 'Витамины', en: 'Vitamins' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'somatic',
  },
  vascular_drugs: {
    id: 'vascular_drugs',
    label: { ru: 'Сосудистые', en: 'Vascular drugs' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'somatic',
  },
  nootropics: {
    id: 'nootropics',
    label: { ru: 'Ноотропы', en: 'Nootropics' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'somatic',
  },
  mood_stabilizers: {
    id: 'mood_stabilizers',
    label: { ru: 'Профилактика (нормотимики)', en: 'Prophylaxis (mood stabilizers)' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'somatic',
  },

  // --- 2. КЛАССЫ АНТИДЕПРЕССАНТОВ (0 - нет, 1 - да) ---

  ad_any: {
    id: 'ad_any',
    label: { ru: 'Антидепрессанты (Факт)', en: 'Antidepressants (fact)' },
    ui: 'badge-readonly',
    db_type: 'BOOLEAN',
    group: 'ad_classes',
    calculate: (row: any) =>
      row.ad_tricyclic ||
      row.ad_tetracyclic ||
      row.ad_other_noradr ||
      row.ad_serotonergic ||
      row.ad_snri ||
      row.ad_maoi ||
      row.ad_atypical_mech ||
      row.ad_transitional
        ? 1
        : 0,
  },
  ad_tricyclic: {
    id: 'ad_tricyclic',
    label: { ru: 'ТЦА (Норадренергические)', en: 'TCA (noradrenergic)' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'ad_classes',
  },
  ad_tetracyclic: {
    id: 'ad_tetracyclic',
    label: { ru: 'Тетрациклические', en: 'Tetracyclic' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'ad_classes',
  },
  ad_other_noradr: {
    id: 'ad_other_noradr',
    label: { ru: 'Норадр. другой структуры', en: 'Noradrenergic, other structure' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'ad_classes',
  },
  ad_serotonergic: {
    id: 'ad_serotonergic',
    label: { ru: 'Серотонинергические (СИОЗС)', en: 'Serotonergic (SSRI)' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'ad_classes',
  },
  ad_snri: {
    id: 'ad_snri',
    label: { ru: 'СИОЗСиН', en: 'SNRI' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'ad_classes',
  },
  ad_maoi: {
    id: 'ad_maoi',
    label: { ru: 'ИМАО (обратимые)', en: 'MAOI (reversible)' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'ad_classes',
  },
  ad_atypical_mech: {
    id: 'ad_atypical_mech',
    label: {
      ru: 'Неизвестный механизм (коаксил и др.)',
      en: 'Atypical mechanism (tianeptine etc.)',
    },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'ad_classes',
  },
  ad_transitional: {
    id: 'ad_transitional',
    label: {
      ru: 'Переходные (гептрал, ксанакс и др.)',
      en: 'Transitional (ademetionine, alprazolam etc.)',
    },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'ad_classes',
  },

  // --- 3. ПАРАМЕТРЫ КУРСА АД ---
  ad_dose_level: {
    id: 'ad_dose_level',
    label: { ru: 'Дозы АД', en: 'AD doses' },
    ui: 'select',
    options: [
      { value: 0, label: { ru: 'Нет', en: 'None' } },
      { value: 1, label: { ru: 'Низкие', en: 'Low' } },
      { value: 2, label: { ru: 'Средние', en: 'Medium' } },
      { value: 3, label: { ru: 'Высокие', en: 'High' } },
    ],
    db_type: 'INTEGER',
    group: 'ad_course',
  },
  ad_route: {
    id: 'ad_route',
    label: { ru: 'Способ введения АД', en: 'AD route' },
    ui: 'select',
    options: [
      { value: 0, label: { ru: 'Нет', en: 'None' } },
      { value: 1, label: { ru: 'Внутрь', en: 'Oral' } },
      { value: 2, label: { ru: 'В/м', en: 'IM' } },
      { value: 3, label: { ru: 'В/в', en: 'IV' } },
      {
        value: 4,
        label: { ru: 'Сочетание (внутрь + парент.)', en: 'Combined (oral + parenteral)' },
      },
    ],
    db_type: 'INTEGER',
    group: 'ad_course',
  },
  days_to_improvement: {
    id: 'days_to_improvement',
    label: { ru: 'Дней до улучшения', en: 'Days to improvement' },
    ui: 'number-input',
    db_type: 'INTEGER',
    min: 0,
    group: 'ad_course',
  },
  total_days: {
    id: 'total_days',
    label: { ru: 'Длительность всего (дней)', en: 'Total duration (days)' },
    ui: 'number-input',
    db_type: 'INTEGER',
    min: 0,
    group: 'ad_course',
  },
  ad_efficacy: {
    id: 'ad_efficacy',
    label: { ru: 'Эффективность АД', en: 'AD efficacy' },
    ui: 'select',
    options: [
      { value: 1, label: { ru: 'Без улучшения / ухудшение', en: 'No improvement / worsening' } },
      { value: 2, label: { ru: 'Минимальный эффект', en: 'Minimal effect' } },
      {
        value: 3,
        label: {
          ru: 'Умеренный эффект (част. ремиссия)',
          en: 'Moderate effect (partial remission)',
        },
      },
      {
        value: 4,
        label: {
          ru: 'Значительный эффект (полная ремиссия)',
          en: 'Marked effect (full remission)',
        },
      },
    ],
    db_type: 'INTEGER',
    group: 'ad_course',
  },
  ad_switch: {
    id: 'ad_switch',
    label: { ru: 'Смена препарата', en: 'Drug switch' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'ad_course',
  },
  switch_reason: {
    id: 'switch_reason',
    label: { ru: 'Причина смены', en: 'Switch reason' },
    ui: 'select',
    options: [
      { value: 0, label: { ru: 'Нет', en: 'None' } },
      { value: 1, label: { ru: 'Резистентность', en: 'Resistance' } },
      { value: 2, label: { ru: 'Побочные эффекты', en: 'Side effects' } },
      { value: 3, label: { ru: 'Субъективные факторы', en: 'Subjective factors' } },
      { value: 4, label: { ru: 'Другие (цена, отсутствие)', en: 'Other (cost, availability)' } },
    ],
    db_type: 'INTEGER',
    group: 'ad_course',
    // Условная видимость (ad_switch === true) будет реализована в UI-слое
    // через options/условия рендера; здесь — только декларация поля.
  },

  // --- 4. НЕЙРОЛЕПТИКИ И ТРАНКВИЛИЗАТОРЫ ---

  nl_typical: {
    id: 'nl_typical',
    label: { ru: 'НЛ Типичные', en: 'Typical antipsychotics' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'nl_trank',
  },
  nl_atypical: {
    id: 'nl_atypical',
    label: { ru: 'НЛ Атипичные', en: 'Atypical antipsychotics' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'nl_trank',
  },
  nl_dose_level: {
    id: 'nl_dose_level',
    label: { ru: 'Дозы Нейролептиков', en: 'Antipsychotic doses' },
    ui: 'select',
    options: [
      { value: 0, label: { ru: 'Нет', en: 'None' } },
      { value: 1, label: { ru: 'Низкие', en: 'Low' } },
      { value: 2, label: { ru: 'Средние', en: 'Medium' } },
      { value: 3, label: { ru: 'Высокие', en: 'High' } },
    ],
    db_type: 'INTEGER',
    group: 'nl_trank',
  },
  trank_benzodiazep: {
    id: 'trank_benzodiazep',
    label: { ru: 'Бензодиазепины', en: 'Benzodiazepines' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'nl_trank',
  },
  trank_barbiturates: {
    id: 'trank_barbiturates',
    label: { ru: 'Барбитураты', en: 'Barbiturates' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'nl_trank',
  },
  trank_other_chem: {
    id: 'trank_other_chem',
    label: { ru: 'Транкв. других групп', en: 'Tranquilizers, other groups' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'nl_trank',
  },
  trank_herbal: {
    id: 'trank_herbal',
    label: { ru: 'Транкв. растительные', en: 'Herbal tranquilizers' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'nl_trank',
  },
  hypnotics: {
    id: 'hypnotics',
    label: { ru: 'Гипнотики', en: 'Hypnotics' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
    group: 'nl_trank',
  },
  trank_dose_level: {
    id: 'trank_dose_level',
    label: { ru: 'Дозы Транквилизаторов', en: 'Tranquilizer doses' },
    ui: 'select',
    options: [
      { value: 0, label: { ru: 'Нет', en: 'None' } },
      { value: 1, label: { ru: 'Низкие', en: 'Low' } },
      { value: 2, label: { ru: 'Средние', en: 'Medium' } },
      { value: 3, label: { ru: 'Высокие', en: 'High' } },
    ],
    db_type: 'INTEGER',
    group: 'nl_trank',
  },
  trank_route: {
    id: 'trank_route',
    label: { ru: 'Способ введения (Транк)', en: 'Route (tranquilizer)' },
    ui: 'select',
    options: [
      { value: 0, label: { ru: 'Нет', en: 'None' } },
      { value: 1, label: { ru: 'Внутрь', en: 'Oral' } },
      { value: 2, label: { ru: 'В/м', en: 'IM' } },
    ],
    db_type: 'INTEGER',
    group: 'nl_trank',
  },
  trank_efficacy: {
    id: 'trank_efficacy',
    label: { ru: 'Эффект (сон/тревога)', en: 'Effect (sleep/anxiety)' },
    ui: 'select',
    options: [
      { value: 1, label: { ru: 'Без эффекта', en: 'No effect' } },
      { value: 2, label: { ru: 'Минимальный', en: 'Minimal' } },
      { value: 3, label: { ru: 'Умеренный', en: 'Moderate' } },
      { value: 4, label: { ru: 'Значительный', en: 'Marked' } },
    ],
    db_type: 'INTEGER',
    group: 'nl_trank',
  },
}
