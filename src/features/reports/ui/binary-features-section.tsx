import type { Locale } from '@/shared/lib/intl'
import { REGISTRY, THERAPY_GROUPS } from '@/shared/config'
import type { RegistryField } from '@/shared/config'
import { DistributionTableYes, type YesFeatureRow } from './distribution-table-yes'

/**
 * Секция /reports «Бинарные признаки фаз»: одна таблица DistributionTableYes
 * на секцию реестра / её подгруппу — разделение повторяет матрицу
 * (src/widgets/matrix/model/matrix-rows.ts: SECTION_ORDER / SECTION_TITLES /
 * SECTION_GROUPS + THERAPY_GROUPS). Секции patient/phase/diagnostic бинарных
 * полей фаз не содержат и не выводятся. Импорт из widgets в features запрещён
 * (FSD), поэтому словари зеркалятся локально — прецедент:
 * src/shared/lib/registry/data-dictionary.ts (SECTION_GROUPS).
 */

export interface BinaryFeatureCountView {
  fieldId: string
  yes: number
  total: number
}

/** Секции реестра с бинарными полями фаз, в порядке матрицы (SECTION_ORDER). */
const BINARY_SECTIONS = ['status', 'therapy', 'remission'] as const

/** Заголовки секций (зеркало SECTION_TITLES матрицы). */
const SECTION_TITLES: Record<(typeof BINARY_SECTIONS)[number], { ru: string; en: string }> = {
  status: { ru: 'Психический статус', en: 'Mental status' },
  therapy: { ru: 'Фармакотерапия', en: 'Pharmacotherapy' },
  remission: { ru: 'Ремиссия', en: 'Remission' },
}

/** Одна таблица «да/нет»: заголовок группы + строки признаков. */
export interface BinaryGroup {
  title: string
  rows: YesFeatureRow[]
}

/**
 * Группировка бинарных признаков по секциям реестра; фармакотерапия —
 * дополнительно по подгруппам THERAPY_GROUPS в порядке `order` (как
 * subheader-строки матрицы). Пропускаются: пустые группы (нет полей) и
 * группы без заполненных данных (все знаменатели = 0 — признак нигде
 * не вводился в рамках scope; блок «Нет данных» шумит на странице).
 */
export function buildBinaryGroups(counts: BinaryFeatureCountView[], locale: Locale): BinaryGroup[] {
  const en = locale === 'en'
  const byId = new Map(counts.map((c) => [c.fieldId, c]))
  // Критерии бинарного поля фазы — те же, что у BINARY_PHASE_COLUMNS
  // (src/entities/phase/api/queries.ts): BOOLEAN, не patient-scope, без
  // calculate; плюс счётчик из запроса. Это отсекает случайные/не-бинарные id.
  const isBinary = (f: RegistryField): boolean =>
    f.db_type === 'BOOLEAN' && f.scope !== 'patient' && f.calculate === undefined && byId.has(f.id)
  const rowOf = (f: RegistryField): YesFeatureRow => {
    const c = byId.get(f.id)
    return {
      label: typeof f.label === 'string' ? f.label : en ? f.label.en : f.label.ru,
      yes: c?.yes ?? 0,
      total: c?.total ?? 0,
    }
  }
  const groupTitle = (section: (typeof BINARY_SECTIONS)[number]): string => {
    const t = SECTION_TITLES[section]
    return en ? t.en : t.ru
  }

  const groups: BinaryGroup[] = []
  for (const section of BINARY_SECTIONS) {
    const fields = (Object.values(REGISTRY[section]) as RegistryField[]).filter(isBinary)
    if (fields.length === 0) continue
    if (section === 'therapy') {
      // Подгруппы фармакотерапии — порядок THERAPY_GROUPS (order), как в матрице.
      const ordered = Object.entries(THERAPY_GROUPS).sort((a, b) => a[1].order - b[1].order)
      for (const [groupId, title] of ordered) {
        const rows = fields.filter((f) => f.group === groupId).map(rowOf)
        // Блок без заполненных данных (все знаменатели = 0) не показываем.
        if (rows.length === 0 || !rows.some((r) => r.total > 0)) continue
        groups.push({ title: en ? title.en : title.ru, rows })
      }
      // Поля без подгруппы (теоретический случай) — плоской таблицей секции.
      const ungrouped = fields.filter((f) => f.group === undefined).map(rowOf)
      if (ungrouped.length > 0 && ungrouped.some((r) => r.total > 0)) {
        groups.push({ title: groupTitle(section), rows: ungrouped })
      }
    } else {
      const rows = fields.map(rowOf)
      if (!rows.some((r) => r.total > 0)) continue
      groups.push({ title: groupTitle(section), rows })
    }
  }
  return groups
}

/**
 * Секция /reports с бинарными признаками фаз: по таблице на секцию реестра
 * (Психический статус, Ремиссия) и на подгруппу фармакотерапии. Серверный
 * рендер, без JS.
 */
export function BinaryFeaturesSection({
  counts,
  locale,
}: {
  counts: BinaryFeatureCountView[]
  locale: Locale
}) {
  const en = locale === 'en'
  const groups = buildBinaryGroups(counts, locale)
  if (groups.length === 0) {
    // Нет ни одной группы с заполненными данными (например, у пользователя
    // пустой scope) — заглушка, как у остальных таблиц панели.
    return (
      <div className="space-y-2">
        <p className="text-xs text-neutral-500">{en ? 'No data' : 'Нет данных'}</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {/* Masonry через CSS-колонки (Tailwind v4): таблицы разной высоты
          укладываются плотно, без JS; break-inside-avoid не даёт разрывать
          карточку между колонками. Порядок блоков — колонками сверху вниз. */}
      <div className="columns-1 gap-4 lg:columns-2">
        {groups.map((g) => (
          <div
            key={g.title}
            className="mb-4 inline-block w-full break-inside-avoid space-y-1 rounded-md border border-neutral-200 p-3"
          >
            <h3 className="mb-1.5 text-xs font-semibold text-neutral-600">{g.title}</h3>
            <DistributionTableYes rows={g.rows} locale={locale} />
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-500">
        {en
          ? 'Share of phases with the feature among phases with the attribute filled (0/1); service phases 98/99 excluded.'
          : 'Доля фаз с признаком среди фаз с заполненным значением (0/1); служебные фазы 98/99 исключены.'}
      </p>
    </div>
  )
}
