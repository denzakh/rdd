/**
 * РЕГИСТР: БЛОК ФАРМАКОТЕРАПИИ
 * Описывает лечение для каждой фазы (от 1 до 99)
 */

export const THERAPY_REGISTRY = {
  // --- 1. СОПУТСТВУЮЩАЯ ТЕРАПИЯ (0 - нет, 1 - да) ---

  beta_blockers: {
    id: 'beta_blockers',
    label: 'Бета-блокаторы',
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  ca_blockers: { id: 'ca_blockers', label: 'Блокаторы Са', ui: 'checkbox', db_type: 'BOOLEAN' },
  other_depressogenic: {
    id: 'other_depressogenic',
    label: 'Другие депрессогенные',
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  vitamins: { id: 'vitamins', label: 'Витамины', ui: 'checkbox', db_type: 'BOOLEAN' },
  vascular_drugs: { id: 'vascular_drugs', label: 'Сосудистые', ui: 'checkbox', db_type: 'BOOLEAN' },
  nootropics: { id: 'nootropics', label: 'Ноотропы', ui: 'checkbox', db_type: 'BOOLEAN' },
  mood_stabilizers: {
    id: 'mood_stabilizers',
    label: 'Профилактика (нормотимики)',
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },

  // --- 2. КЛАССЫ АНТИДЕПРЕССАНТОВ (0 - нет, 1 - да) ---

  ad_any: {
    id: 'ad_any',
    label: 'Антидепрессанты (Факт)',
    ui: 'badge-readonly',
    db_type: 'BOOLEAN',
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
    label: 'ТЦА (Норадренергические)',
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  ad_tetracyclic: {
    id: 'ad_tetracyclic',
    label: 'Тетрациклические',
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  ad_other_noradr: {
    id: 'ad_other_noradr',
    label: 'Норадр. другой структуры',
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  ad_serotonergic: {
    id: 'ad_serotonergic',
    label: 'Серотонинергические (СИОЗС)',
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  ad_snri: { id: 'ad_snri', label: 'СИОЗСиН', ui: 'checkbox', db_type: 'BOOLEAN' },
  ad_maoi: { id: 'ad_maoi', label: 'ИМАО (обратимые)', ui: 'checkbox', db_type: 'BOOLEAN' },
  ad_atypical_mech: {
    id: 'ad_atypical_mech',
    label: 'Неизвестный механизм (коаксил и др.)',
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  ad_transitional: {
    id: 'ad_transitional',
    label: 'Переходные (гептрал, ксанакс и др.)',
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },

  // --- 3. ПАРАМЕТРЫ КУРСА АД ---
  ad_dose_level: {
    id: 'ad_dose_level',
    label: 'Дозы АД',
    ui: 'select',
    options: [
      { value: 0, label: 'Нет' },
      { value: 1, label: 'Низкие' },
      { value: 2, label: 'Средние' },
      { value: 3, label: 'Высокие' },
    ],
    db_type: 'INTEGER',
  },
  ad_route: {
    id: 'ad_route',
    label: 'Способ введения АД',
    ui: 'select',
    options: [
      { value: 0, label: 'Нет' },
      { value: 1, label: 'Внутрь' },
      { value: 2, label: 'В/м' },
      { value: 3, label: 'В/в' },
      { value: 4, label: 'Сочетание (внутрь + парент.)' },
    ],
    db_type: 'INTEGER',
  },
  days_to_improvement: {
    id: 'days_to_improvement',
    label: 'Дней до улучшения',
    ui: 'number',
    db_type: 'INTEGER',
  },
  total_days: {
    id: 'total_days',
    label: 'Длительность всего (дней)',
    ui: 'number',
    db_type: 'INTEGER',
  },
  ad_efficacy: {
    id: 'ad_efficacy',
    label: 'Эффективность АД',
    ui: 'select',
    options: [
      { value: 1, label: 'Без улучшения / ухудшение' },
      { value: 2, label: 'Минимальный эффект' },
      { value: 3, label: 'Умеренный эффект (част. ремиссия)' },
      { value: 4, label: 'Значительный эффект (полная ремиссия)' },
    ],
    db_type: 'INTEGER',
  },
  ad_switch: { id: 'ad_switch', label: 'Смена препарата', ui: 'checkbox', db_type: 'BOOLEAN' },
  switch_reason: {
    id: 'switch_reason',
    label: 'Причина смены',
    ui: 'select',
    options: [
      { value: 0, label: 'Нет' },
      { value: 1, label: 'Резистентность' },
      { value: 2, label: 'Побочные эффекты' },
      { value: 3, label: 'Субъективные факторы' },
      { value: 4, label: 'Другие (цена, отсутствие)' },
    ],
    db_type: 'INTEGER',
    visibility: 'ad_switch === true',
  },

  // --- 4. НЕЙРОЛЕПТИКИ И ТРАНКВИЛИЗАТОРЫ ---

  nl_typical: { id: 'nl_typical', label: 'НЛ Типичные', ui: 'checkbox', db_type: 'BOOLEAN' },
  nl_atypical: { id: 'nl_atypical', label: 'НЛ Атипичные', ui: 'checkbox', db_type: 'BOOLEAN' },
  nl_dose_level: {
    id: 'nl_dose_level',
    label: 'Дозы Нейролептиков',
    ui: 'select',
    options: [
      { value: 0, label: 'Нет' },
      { value: 1, label: 'Низкие' },
      { value: 2, label: 'Средние' },
      { value: 3, label: 'Высокие' },
    ],
    db_type: 'INTEGER',
  },
  trank_benzodiazep: {
    id: 'trank_benzodiazep',
    label: 'Бензодиазепины',
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  trank_barbiturates: {
    id: 'trank_barbiturates',
    label: 'Барбитураты',
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  trank_other_chem: {
    id: 'trank_other_chem',
    label: 'Транкв. других групп',
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  trank_herbal: {
    id: 'trank_herbal',
    label: 'Транкв. растительные',
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  hypnotics: { id: 'hypnotics', label: 'Гипнотики', ui: 'checkbox', db_type: 'BOOLEAN' },
  trank_dose_level: {
    id: 'trank_dose_level',
    label: 'Дозы Транквилизаторов',
    ui: 'select',
    options: [
      { value: 0, label: 'Нет' },
      { value: 1, label: 'Низкие' },
      { value: 2, label: 'Средние' },
      { value: 3, label: 'Высокие' },
    ],
    db_type: 'INTEGER',
  },
  trank_route: {
    id: 'trank_route',
    label: 'Способ введения (Транк)',
    ui: 'select',
    options: [
      { value: 0, label: 'Нет' },
      { value: 1, label: 'Внутрь' },
      { value: 2, label: 'В/м' },
    ],
    db_type: 'INTEGER',
  },
  trank_efficacy: {
    id: 'trank_efficacy',
    label: 'Эффект (сон/тревога)',
    ui: 'select',
    options: [
      { value: 1, label: 'Без эффекта' },
      { value: 2, label: 'Минимальный' },
      { value: 3, label: 'Умеренный' },
      { value: 4, label: 'Значительный' },
    ],
    db_type: 'INTEGER',
  },
}
