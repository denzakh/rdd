/**
 * Diff-генератор миграций D1 из реестра полей и снапшота.
 * Запуск: npm run gen:d1
 *
 * Поведение:
 *  - первый запуск: пишет baseline migrations/0001_init.sql и снапшот;
 *  - последующие: сравнивает реестр (цель) со снапшотом (факт в проде),
 *    генерирует дельту 000N_*.sql (ADD/RENAME) и обновляет снапшот;
 *  - при экзотических операциях (смена типа, удаление, перенос между таблицами,
 *    неоднозначные наборы) — АЛЕРТ и операция АБОРТИРУЕТСЯ (код выхода != 0).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildDesiredTables,
  computeDelta,
  generateD1Schema,
  renderDeltaSql,
  type ExoticOp,
  type SchemaOp,
  type SchemaSnapshot,
  type TableColumn,
  type TableId,
} from '@/shared/lib/registry/d1-schema'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const migrationsDir = join(projectRoot, 'migrations')
const snapshotPath = join(migrationsDir, '.schema-snapshot.json')
// Референс-базовый SQL. Храним ВНЕ каталога migrations, т.к. Wrangler применяет
// все *.sql из migrations_dir как миграции (шаблон `NNNN_*.sql` не обязателен).
const referencePath = join(projectRoot, 'schema-reference.sql')

mkdirSync(migrationsDir, { recursive: true })

/** Чтение снапшота; null, если его ещё нет. */
const readSnapshot = (): SchemaSnapshot | null => {
  if (!existsSync(snapshotPath)) return null
  try {
    return JSON.parse(readFileSync(snapshotPath, 'utf8')) as SchemaSnapshot
  } catch {
    console.error('⚠️  Снапшот повреждён — удалите его вручную и повторите, либо восстановите.')
    process.exit(1)
  }
}

/** Следующий номер миграции на основе существующих файлов migrations/*.sql. */
const nextMigrationNumber = (): number => {
  let max = 0
  for (const f of readdirSync(migrationsDir)) {
    const m = /^(\d{4})_/.exec(f)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
}

const describeOps = (ops: SchemaOp[]): string => {
  const parts = ops.map((op) =>
    op.kind === 'add'
      ? `add ${op.table}.${op.column.name}`
      : `rename ${op.table}.${op.from}->${op.to}`
  )
  return parts.join(', ')
}

const describeExotic = (ex: ExoticOp[]): string =>
  ex
    .map((e) => {
      switch (e.kind) {
        case 'type-change':
          return `смена типа ${e.table}.${e.column}: ${e.from} -> ${e.to}`
        case 'drop':
          return `удаление колонки ${e.table}.${e.column}`
        case 'moved':
          return `перенос колонки ${e.column}: ${e.from} -> ${e.to}`
      }
    })
    .join('\n  - ')

const snapshotFrom = (
  version: number,
  desired: Record<TableId, TableColumn[]>
): SchemaSnapshot => ({ version, tables: desired })

const main = (): void => {
  const desired = buildDesiredTables()
  const snapshot = readSnapshot()

  // Всегда пишем актуальный baseline-референс (полная картина из реестра)
  writeFileSync(referencePath, generateD1Schema(desired), 'utf8')

  // --- Первый запуск: baseline + снапшот ---
  if (!snapshot) {
    const num = nextMigrationNumber()
    writeFileSync(
      join(migrationsDir, `${String(num).padStart(4, '0')}_init.sql`),
      generateD1Schema(desired),
      'utf8'
    )
    writeFileSync(snapshotPath, JSON.stringify(snapshotFrom(num, desired), null, 2), 'utf8')
    console.log(`✔  Baseline сгенерирован: migrations/${String(num).padStart(4, '0')}_init.sql`)
    console.log(`✔  Снапшот создан: ${snapshotPath} (v${num})`)
    return
  }

  // --- Последующие запуски: diff ---
  const { ops, exotic } = computeDelta(desired, snapshot)

  // Алерт + abort при экзотике
  if (exotic.length > 0) {
    console.error('')
    console.error('❌  ОБНАРУЖЕНЫ ЭКЗОТИЧЕСКИЕ ИЗМЕНЕНИЯ СХЕМЫ. ОПЕРАЦИЯ АБОРТИРОВАНА.')
    console.error('Автоматическая генерация выполняется только для ADD/RENAME COLUMN.')
    console.error('Требуется ручное вмешательство. Обнаружено:')
    console.error(`  - ${describeExotic(exotic)}`)
    console.error('')
    console.error('Исправьте реестр так, чтобы изменения были только ADD/RENAME,')
    console.error('либо выполните миграцию вручную.')
    process.exit(1)
  }

  if (ops.length === 0) {
    console.log('ℹ️  Схема без изменений — дельта не требуется.')
    return
  }

  // Запись дельты
  const num = nextMigrationNumber()
  const filename = `${String(num).padStart(4, '0')}_${ops[0].kind === 'add' ? 'add' : 'update'}.sql`
  writeFileSync(join(migrationsDir, filename), renderDeltaSql(ops), 'utf8')

  // Обновление снапшота
  writeFileSync(snapshotPath, JSON.stringify(snapshotFrom(num, desired), null, 2), 'utf8')

  console.log(`✔  Дельта сгенерирована: migrations/${filename}`)
  console.log(`   Операции: ${describeOps(ops)}`)
  console.log(`✔  Снапшот обновлён до v${num}`)
}

main()