export const PATIENT_REGISTRY = {
  // --- Системные и опорные даты ---
  study_entry_date: {
    id: 'study_entry_date',
    label: { ru: 'Дата включения в исследование', en: 'Date of Inclusion' },
    ui: 'date-picker',
    db_type: 'DATE',
    zod: 'z.date()',
    defaultValue: 'current_date',
    scope: 'patient',
  },
  birth_year: {
    id: 'birth_year',
    label: { ru: 'Год рождения', en: 'Year of Birth' },
    ui: 'number-input',
    db_type: 'INTEGER',
    zod: 'z.number().min(1900).max(new Date().getFullYear())',
    scope: 'patient',
  },

  // --- Автоматически вычисляемые поля ---
  current_age: {
    id: 'current_age',
    label: { ru: 'Возраст (полных лет)', en: 'Current Age' },
    ui: 'number-readonly',
    db_type: 'INTEGER',
    // Логика: study_entry_date.year - birth_year
    calculate: (data) => diffYears(data.study_entry_date, data.birth_year),
    scope: 'patient',
  },
  age_group: {
    id: 'age_group',
    label: { ru: 'Возрастная группа', en: 'Age Group' },
    ui: 'select-readonly',
    db_type: 'INTEGER',
    options: [
      { value: 1, label: 'до 50 лет' },
      { value: 2, label: '50-59' },
      { value: 3, label: '60-69' },
      { value: 4, label: '70-79' },
      { value: 5, label: '80 и старше' },
    ],
    // Авто-выбор на основе current_age
    calculate: (data) => map_age_to_group(data.current_age),
    scope: 'patient',
  },

  // --- Антропометрия и Социум ---
  gender: {
    id: 'gender',
    label: { ru: 'Пол', en: 'Gender' },
    ui: 'radio-group',
    db_type: 'INTEGER',
    options: [
      { value: 1, label: 'Мужской' },
      { value: 2, label: 'Женский' },
    ],
    zod: 'z.enum([1, 2])',
    scope: 'patient',
  },
  education_level: {
    id: 'education_level',
    label: { ru: 'Образование', en: 'Education Level' },
    ui: 'select',
    db_type: 'INTEGER',
    options: [
      { value: 1, label: 'Начальное' },
      { value: 2, label: 'Среднее' },
      { value: 3, label: 'Высшее' },
    ],
    zod: 'z.number().min(1).max(3)',
    scope: 'patient',
  },
  career_level: {
    id: 'career_level',
    label: { ru: 'Трудовая деятельность', en: 'Career Level' },
    ui: 'select',
    db_type: 'INTEGER',
    options: [
      { value: 1, label: 'Малоквалифицированная' },
      { value: 2, label: 'Квалифицированная' },
      { value: 3, label: 'Высококвалифицированная' },
    ],
    zod: 'z.number().min(1).max(3)',
    scope: 'patient',
  },
  living_status: {
    id: 'living_status',
    label: { ru: 'Проживание', en: 'Living Status' },
    ui: 'select',
    db_type: 'INTEGER',
    options: [
      { value: 1, label: 'Одинокое' },
      { value: 2, label: 'С супругом' },
      { value: 3, label: 'С супругом и/или семьей' },
      { value: 4, label: 'Прочее' },
    ],
    zod: 'z.number().min(1).max(4)',
    scope: 'patient',
  },
  disability_status: {
    id: 'disability_status',
    label: { ru: 'Инвалидность', en: 'Disability Status' },
    ui: 'select',
    db_type: 'INTEGER',
    options: [
      { value: 0, label: 'Нет' },
      { value: 1, label: '1 группа' },
      { value: 2, label: '2 группа' },
      { value: 3, label: '3 группа' },
    ],
    zod: 'z.number().min(0).max(3)',
    scope: 'patient',
  },
  family_history: {
    id: 'family_history',
    label: { ru: 'Наследственная отягощенность', en: 'Family History' },
    ui: 'toggle-binary', // 0/1
    db_type: 'BOOLEAN',
    zod: 'z.boolean()',
    scope: 'patient',
  },
  personality_type: {
    id: 'personality_type',
    label: { ru: 'Преобладающий тип личности', en: 'Personality Type' },
    ui: 'select',
    db_type: 'INTEGER',
    options: [
      { value: 1, label: 'Гармоничный' },
      { value: 2, label: 'Параноидный' },
      { value: 3, label: 'Шизоидный' },
      { value: 4, label: 'Диссоциальный' },
      { value: 5, label: 'Эмоционально-неустойчивый' },
      { value: 6, label: 'Истерический' },
      { value: 7, label: 'Ананкастный' },
      { value: 8, label: 'Тревожный' },
      { value: 9, label: 'Зависимый' },
      { value: 10, label: 'Другой' },
    ],
    zod: 'z.number().min(1).max(10)',
    scope: 'patient',
  },
}
