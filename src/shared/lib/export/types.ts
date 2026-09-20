/**
 * Нейтральные типы де-идентифицированного датасета (docs/ru/export.md).
 * Живут в shared, чтобы слой сериализации (shared/lib/export) не импортировал
 * entities (FSD: shared не может зависеть от верхних слоёв). Слой агрегации
 * (entities/phase/api/queries.ts) импортирует их отсюда и наполняет.
 */

/** Одна строка де-идентифицированного датасета (нейтральный TS-объект). */
export interface DeidentifiedRow {
  /** Sequence-номер исследования (1..N), заменяет patients.id. */
  seq_id: number
  /**
   * Версия протокола CRF на момент сбора фазы (docs/ru/schema-evolution.md §4, §6).
   * Обязательное поле для биостатистика: без метки смешение кодов разных
   * версий одной шкалы в одной колонке даёт незаметный стат. артефакт.
   */
  registry_version: number
  /** Возраст пациента (полных лет) на момент начала фазы (абсолютных дат нет). */
  age_at_the_beginning_of_the_phase: number | null
  gender: number | null
  education_level: number | null
  career_level: number | null
  living_status: number | null
  disability_status: number | null
  family_history: number | null
  personality_type: number | null
  phase_order_id: number
  phase_duration_months: number | null
  intermission_duration: number | null
  prophylaxis_type: number | null
  onset_trigger: number | null
  main_component: number | null
  ad_efficacy: number | null
  hamd_total: number | null
  beck_total: number | null
  mmse_total: number | null
  /** Остальные клинические колонки фаз (DATA_COLUMNS минус pii), NULL-able. */
  [key: string]: number | null
}

export interface DeidentifiedDataset {
  rows: DeidentifiedRow[]
  /** Имена колонок в стабильном порядке (для сериализаторов csv/xlsx). */
  columns: string[]
  meta: {
    exportedAt: string
    patients: number
    rowsTotal: number
    /** Версии протокола, представленные в выгрузке (docs/ru/schema-evolution.md §6). */
    registryVersions: number[]
  }
}
