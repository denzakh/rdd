export const MENTAL_STATUS_REGISTRY = {
  // --- ТРИГГЕРЫ И КОМПОНЕНТЫ ---
  onset_trigger: {
    id: 'onset_trigger',
    label: { ru: 'Совпадение начала обострения', en: 'Exacerbation onset coincidence' },
    ui: 'select',
    options: [
      { value: 0, label: { ru: 'Нет / Не известно', en: 'None / Unknown' } },
      { value: 1, label: { ru: 'Психотравма', en: 'Psychotrauma' } },
      { value: 2, label: { ru: 'Интоксикация', en: 'Intoxication' } },
      { value: 3, label: { ru: 'Климакс', en: 'Menopause' } },
      { value: 4, label: { ru: 'ЧМТ', en: 'TBI' } },
      { value: 5, label: { ru: 'Операция', en: 'Surgery' } },
      { value: 6, label: { ru: 'ОНМК', en: 'Stroke' } },
      {
        value: 7,
        label: { ru: 'Обострение соматики/неврологии', en: 'Somatic/neurologic exacerbation' },
      },
    ],
    db_type: 'INTEGER',
  },
  main_component: {
    id: 'main_component',
    label: { ru: 'Преобладающий компонент депрессии', en: 'Predominant depression component' },
    ui: 'select',
    options: [
      { value: 0, label: { ru: 'Отсутствует', en: 'Absent' } },
      { value: 1, label: { ru: 'Тоскливый', en: 'Melancholic' } },
      { value: 2, label: { ru: 'Тревожный', en: 'Anxious' } },
      { value: 3, label: { ru: 'Апатический', en: 'Apathetic' } },
      { value: 5, label: { ru: 'Астенический / слабодушие', en: 'Asthenic' } },
      {
        value: 6,
        label: { ru: 'Дереализация / деперсонализация', en: 'Derealization / depersonalization' },
      },
    ],
    db_type: 'INTEGER',
  },

  // --- БАЗОВЫЕ ФУНКЦИИ ---
  orientation: {
    id: 'orientation',
    label: { ru: 'Ориентировка', en: 'Orientation' },
    ui: 'toggle-binary',
    options: [
      { value: 0, label: { ru: 'Нарушена', en: 'Impaired' } },
      { value: 1, label: { ru: 'Сохранена', en: 'Intact' } },
    ],
    db_type: 'INTEGER',
  },

  // --- ОБЪЕКТИВНЫЕ ПРИЗНАКИ (БИНАРНЫЕ: 0/1) ---
  melancholy_obj: {
    id: 'melancholy_obj',
    label: { ru: 'Тоска', en: 'Melancholy' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  anxiety_obj: {
    id: 'anxiety_obj',
    label: { ru: 'Тревога', en: 'Anxiety' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  apathy_obj: {
    id: 'apathy_obj',
    label: { ru: 'Безразличие, апатия', en: 'Indifference, apathy' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  sleep_worsening: {
    id: 'sleep_worsening',
    label: { ru: 'Ухудшение сна', en: 'Sleep worsening' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  appetite_loss: {
    id: 'appetite_loss',
    label: { ru: 'Снижение аппетита', en: 'Appetite loss' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  cognitive_impair: {
    id: 'cognitive_impair',
    label: { ru: 'Ухудшение сообразительности/памяти', en: 'Cognitive impairment' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  physical_pain: {
    id: 'physical_pain',
    label: { ru: 'Боли различной локализации', en: 'Physical pain (various)' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  fatigue: {
    id: 'fatigue',
    label: { ru: 'Утомляемость, слабость', en: 'Fatigue, weakness' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },

  // --- ВНЕШНИЙ ВИД И МОТОРИКА ---
  fixed_posture: {
    id: 'fixed_posture',
    label: { ru: 'Однообразная поза', en: 'Fixed posture' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  mimic_poverty: {
    id: 'mimic_poverty',
    label: { ru: 'Бедность мимики', en: 'Poverty of facial expression' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  monotonous_voice: {
    id: 'monotonous_voice',
    label: { ru: 'Тихий монотонный голос', en: 'Quiet monotonous voice' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  motor_retardation: {
    id: 'motor_retardation',
    label: { ru: 'Замедление движений, заторможенность', en: 'Psychomotor retardation' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  delayed_response: {
    id: 'delayed_response',
    label: { ru: 'Ответ после паузы', en: 'Delayed response' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  restlessness: {
    id: 'restlessness',
    label: { ru: 'Неусидчивость, суетливость', en: 'Restlessness, fidgeting' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  affect_lability: {
    id: 'affect_lability',
    label: { ru: 'Эмоциональная лабильность', en: 'Affective lability' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  motor_agitation: {
    id: 'motor_agitation',
    label: { ru: 'Двигательное беспокойство', en: 'Psychomotor agitation' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  hygiene_decline: {
    id: 'hygiene_decline',
    label: { ru: 'Снижение гигиены, неопрятность', en: 'Hygiene decline, untidiness' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },

  // --- СПЕЦИФИКА И ПСИХОТИКА ---
  diurnal_rhythm: {
    id: 'diurnal_rhythm',
    label: { ru: 'Суточные колебания', en: 'Diurnal variation' },
    ui: 'select',
    options: [
      { value: 0, label: { ru: 'Нет', en: 'None' } },
      { value: 1, label: { ru: 'Хуже утром', en: 'Worse in the morning' } },
      { value: 2, label: { ru: 'Хуже вечером', en: 'Worse in the evening' } },
    ],
    db_type: 'INTEGER',
  },
  hypochondria: {
    id: 'hypochondria',
    label: { ru: 'Ипохондрия', en: 'Hypochondria' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  hallucinations: {
    id: 'hallucinations',
    label: { ru: 'Галлюцинаторные расстройства', en: 'Hallucinations' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  delusions: {
    id: 'delusions',
    label: { ru: 'Бредовые расстройства', en: 'Delusions' },
    ui: 'select',
    options: [
      { value: 0, label: { ru: 'Нет', en: 'None' } },
      { value: 1, label: { ru: 'Сверхценные идеи', en: 'Overvalued ideas' } },
      { value: 2, label: { ru: 'Бред самообвинения', en: 'Self-accusation delusions' } },
      { value: 3, label: { ru: 'Ипохондрический бред', en: 'Hypochondriac delusions' } },
      { value: 4, label: { ru: 'Нигилистический бред', en: 'Nihilistic delusions' } },
      { value: 5, label: { ru: 'Бред ущерба/преследования', en: 'Persecutory delusions' } },
    ],
    db_type: 'INTEGER',
  },
  obsessions: {
    id: 'obsessions',
    label: { ru: 'Обсессивные/компульсивные симптомы', en: 'Obsessive/compulsive symptoms' },
    ui: 'checkbox',
    db_type: 'BOOLEAN',
  },
  insight: {
    id: 'insight',
    label: { ru: 'Критика к болезни', en: 'Insight' },
    ui: 'toggle-binary',
    options: [
      { value: 0, label: { ru: 'Снижена', en: 'Impaired' } },
      { value: 1, label: { ru: 'Сохранена', en: 'Intact' } },
    ],
    db_type: 'INTEGER',
  },
}
