import { diffYears, map_age_to_group } from '../../lib/intl/calculations'

export const PATIENT_REGISTRY = {
  // --- Системные и опорные даты ---
  study_entry_date: {
    id: 'study_entry_date',
    label: { ru: 'Дата включения в исследование', en: 'Date of Inclusion' },
    ui: 'date-picker',
    db_type: 'DATE',
    defaultValue: 'current_date',
    scope: 'patient',
    // PII: абсолютная дата — в экспорт не попадает, заменяется
    // относительными интервалами diffMonths (см. docs/export.md).
    pii: true,
  },
  birth_year: {
    id: 'birth_year',
    label: { ru: 'Год рождения', en: 'Year of Birth' },
    ui: 'number-input',
    db_type: 'INTEGER',
    min: 1900,
    scope: 'patient',
    // PII: точный год — в экспорт не попадает, остаётся только age_group.
    pii: true,
  },

  // --- Автоматически вычисляемые поля ---
  current_age: {
    id: 'current_age',
    label: { ru: 'Возраст (полных лет)', en: 'Current Age' },
    ui: 'number-readonly',
    db_type: 'INTEGER',
    // Логика: study_entry_date.year - birth_year
    calculate: (data: Record<string, any>) => diffYears(data.study_entry_date, data.birth_year),
    scope: 'patient',
  },
  age_group: {
    id: 'age_group',
    label: { ru: 'Возрастная группа', en: 'Age Group' },
    ui: 'select-readonly',
    db_type: 'INTEGER',
    options: [
      { value: 1, label: { ru: 'до 50 лет', en: 'under 50' } },
      { value: 2, label: { ru: '50-59', en: '50-59' } },
      { value: 3, label: { ru: '60-69', en: '60-69' } },
      { value: 4, label: { ru: '70-79', en: '70-79' } },
      { value: 5, label: { ru: '80 и старше', en: '80 and older' } },
    ],
    // Авто-выбор на основе current_age
    calculate: (data: Record<string, any>) => map_age_to_group(data.current_age),
    scope: 'patient',
  },

  // --- Антропометрия и Социум ---
  gender: {
    id: 'gender',
    label: { ru: 'Пол', en: 'Gender' },
    ui: 'radio-group',
    db_type: 'INTEGER',
    options: [
      { value: 1, label: { ru: 'Мужской', en: 'Male' } },
      { value: 2, label: { ru: 'Женский', en: 'Female' } },
    ],
    min: 1,
    max: 2,
    scope: 'patient',
  },
  education_level: {
    id: 'education_level',
    label: { ru: 'Образование', en: 'Education Level' },
    ui: 'select',
    db_type: 'INTEGER',
    options: [
      { value: 1, label: { ru: 'Начальное', en: 'Primary' } },
      { value: 2, label: { ru: 'Среднее', en: 'Secondary' } },
      { value: 3, label: { ru: 'Высшее', en: 'Higher' } },
    ],
    min: 1,
    max: 3,
    scope: 'patient',
  },
  career_level: {
    id: 'career_level',
    label: { ru: 'Трудовая деятельность', en: 'Career Level' },
    ui: 'select',
    db_type: 'INTEGER',
    options: [
      { value: 1, label: { ru: 'Малоквалифицированная', en: 'Low-skilled' } },
      { value: 2, label: { ru: 'Квалифицированная', en: 'Skilled' } },
      { value: 3, label: { ru: 'Высококвалифицированная', en: 'Highly skilled' } },
    ],
    min: 1,
    max: 3,
    scope: 'patient',
  },
  living_status: {
    id: 'living_status',
    label: { ru: 'Проживание', en: 'Living Status' },
    ui: 'select',
    db_type: 'INTEGER',
    options: [
      { value: 1, label: { ru: 'Одинокое', en: 'Alone' } },
      { value: 2, label: { ru: 'С супругом', en: 'With spouse' } },
      { value: 3, label: { ru: 'С супругом и/или семьей', en: 'With spouse and/or family' } },
      { value: 4, label: { ru: 'Прочее', en: 'Other' } },
    ],
    min: 1,
    max: 4,
    scope: 'patient',
  },
  disability_status: {
    id: 'disability_status',
    label: { ru: 'Инвалидность', en: 'Disability Status' },
    ui: 'select',
    db_type: 'INTEGER',
    options: [
      { value: 0, label: { ru: 'Нет', en: 'None' } },
      { value: 1, label: { ru: '1 группа', en: 'Group 1' } },
      { value: 2, label: { ru: '2 группа', en: 'Group 2' } },
      { value: 3, label: { ru: '3 группа', en: 'Group 3' } },
    ],
    min: 0,
    max: 3,
    scope: 'patient',
  },
  family_history: {
    id: 'family_history',
    label: { ru: 'Наследственная отягощенность', en: 'Family History' },
    ui: 'toggle-binary', // 0/1
    db_type: 'BOOLEAN',
    scope: 'patient',
  },
  personality_type: {
    id: 'personality_type',
    label: { ru: 'Преобладающий тип личности', en: 'Personality Type' },
    ui: 'select',
    db_type: 'INTEGER',
    options: [
      { value: 1, label: { ru: 'Гармоничный', en: 'Harmonious' } },
      { value: 2, label: { ru: 'Параноидный', en: 'Paranoid' } },
      { value: 3, label: { ru: 'Шизоидный', en: 'Schizoid' } },
      { value: 4, label: { ru: 'Диссоциальный', en: 'Dissocial' } },
      { value: 5, label: { ru: 'Эмоционально-неустойчивый', en: 'Emotionally unstable' } },
      { value: 6, label: { ru: 'Истерический', en: 'Histrionic' } },
      { value: 7, label: { ru: 'Ананкастный', en: 'Anankastic' } },
      { value: 8, label: { ru: 'Тревожный', en: 'Anxious' } },
      { value: 9, label: { ru: 'Зависимый', en: 'Dependent' } },
      { value: 10, label: { ru: 'Другой', en: 'Other' } },
    ],
    min: 1,
    max: 10,
    scope: 'patient',
  },
}
