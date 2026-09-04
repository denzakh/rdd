export const MENTAL_STATUS_REGISTRY = {
  // --- ТРИГГЕРЫ И КОМПОНЕНТЫ ---
  onset_trigger: {
    id: "onset_trigger",
    label: "Совпадение начала обострения",
    ui: "select",
    options: [
      { value: 0, label: "Нет / Не известно" },
      { value: 1, label: "Психотравма" },
      { value: 2, label: "Интоксикация" },
      { value: 3, label: "Климакс" },
      { value: 4, label: "ЧМТ" },
      { value: 5, label: "Операция" },
      { value: 6, label: "ОНМК" },
      { value: 7, label: "Обострение соматики/неврологии" }
    ],
    db_type: "INTEGER"
  },
  main_component: {
    id: "main_component",
    label: "Преобладающий компонент депрессии",
    ui: "select",
    options: [
      { value: 0, label: "Отсутствует" },
      { value: 1, label: "Тоскливый" },
      { value: 2, label: "Тревожный" },
      { value: 3, label: "Апатический" },
      { value: 5, label: "Астенический / слабодушие" },
      { value: 6, label: "Дереализация / деперсонализация" }
    ],
    db_type: "INTEGER"
  },

  // --- БАЗОВЫЕ ФУНКЦИИ ---
  orientation: {
    id: "orientation",
    label: "Ориентировка",
    ui: "binary-toggle",
    options: [{ value: 0, label: "Нарушена" }, { value: 1, label: "Сохранена" }],
    db_type: "INTEGER"
  },

  // --- ОБЪЕКТИВНЫЕ ПРИЗНАКИ (БИНАРНЫЕ: 0/1) ---
  melancholy_obj: { id: "melancholy_obj", label: "Тоска", ui: "checkbox", db_type: "BOOLEAN" },
  anxiety_obj: { id: "anxiety_obj", label: "Тревога", ui: "checkbox", db_type: "BOOLEAN" },
  apathy_obj: { id: "apathy_obj", label: "Безразличие, апатия", ui: "checkbox", db_type: "BOOLEAN" },
  sleep_worsening: { id: "sleep_worsening", label: "Ухудшение сна", ui: "checkbox", db_type: "BOOLEAN" },
  appetite_loss: { id: "appetite_loss", label: "Снижение аппетита", ui: "checkbox", db_type: "BOOLEAN" },
  cognitive_impair: { id: "cognitive_impair", label: "Ухудшение сообразительности/памяти", ui: "checkbox", db_type: "BOOLEAN" },
  physical_pain: { id: "physical_pain", label: "Боли различной локализации", ui: "checkbox", db_type: "BOOLEAN" },
  fatigue: { id: "fatigue", label: "Утомляемость, слабость", ui: "checkbox", db_type: "BOOLEAN" },

  // --- ВНЕШНИЙ ВИД И МОТОРИКА ---
  fixed_posture: { id: "fixed_posture", label: "Однообразная поза", ui: "checkbox", db_type: "BOOLEAN" },
  mimic_poverty: { id: "mimic_poverty", label: "Бедность мимики", ui: "checkbox", db_type: "BOOLEAN" },
  monotonous_voice: { id: "monotonous_voice", label: "Тихий монотонный голос", ui: "checkbox", db_type: "BOOLEAN" },
  motor_retardation: { id: "motor_retardation", label: "Замедление движений, заторможенность", ui: "checkbox", db_type: "BOOLEAN" },
  delayed_response: { id: "delayed_response", label: "Ответ после паузы", ui: "checkbox", db_type: "BOOLEAN" },
  restlessness: { id: "restlessness", label: "Неусидчивость, суетливость", ui: "checkbox", db_type: "BOOLEAN" },
  affect_lability: { id: "affect_lability", label: "Эмоциональная лабильность", ui: "checkbox", db_type: "BOOLEAN" },
  motor_agitation: { id: "motor_agitation", label: "Двигательное беспокойство", ui: "checkbox", db_type: "BOOLEAN" },
  hygiene_decline: { id: "hygiene_decline", label: "Снижение гигиены, неопрятность", ui: "checkbox", db_type: "BOOLEAN" },

  // --- СПЕЦИФИКА И ПСИХОТИКА ---
  diurnal_rhythm: {
    id: "diurnal_rhythm",
    label: "Суточные колебания",
    ui: "select",
    options: [
      { value: 0, label: "Нет" },
      { value: 1, label: "Хуже утром" },
      { value: 2, label: "Хуже вечером" }
    ],
    db_type: "INTEGER"
  },
  hypochondria: { id: "hypochondria", label: "Ипохондрия", ui: "checkbox", db_type: "BOOLEAN" },
  hallucinations: { id: "hallucinations", label: "Галлюцинаторные расстройства", ui: "checkbox", db_type: "BOOLEAN" },
  delusions: {
    id: "delusions",
    label: "Бредовые расстройства",
    ui: "select",
    options: [
      { value: 0, label: "Нет" },
      { value: 1, label: "Сверхценные идеи" },
      { value: 2, label: "Бред самообвинения" },
      { value: 3, label: "Ипохондрический бред" },
      { value: 4, label: "Нигилистический бред" },
      { value: 5, label: "Бред ущерба/преследования" }
    ],
    db_type: "INTEGER"
  },
  obsessions: { id: "obsessions", label: "Обсессивные/компульсивные симптомы", ui: "checkbox", db_type: "BOOLEAN" },
  insight: {
    id: "insight",
    label: "Критика к болезни",
    ui: "binary-toggle",
    options: [{ value: 0, label: "Снижена" }, { value: 1, label: "Сохранена" }],
    db_type: "INTEGER"
  }
};