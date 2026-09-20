import { describe, expect, it } from 'vitest'
import {
  buildDesiredTables,
  generateD1Schema,
  REGISTRY_CURRENT_VERSION,
  REGISTRY_VERSIONS_DDL,
  REGISTRY_VERSIONS_SEED,
  renderOpSql,
} from '@/shared/lib/registry/d1-schema'

/**
 * Версионность протокола в baseline (docs/ru/schema-evolution.md §4).
 * Отдельной миграции 000N нет: registry_versions + patients/phases.registry_version
 * генерируются в 0001_init.sql и применяются только через ресет БД (db:restart).
 */
describe('schema-evolution: baseline содержит версионность (без отдельной миграции)', () => {
  it('desired-таблицы patients/phases содержат registry_version', () => {
    const tables = buildDesiredTables()
    expect(tables.patients.some((c) => c.name === 'registry_version')).toBe(true)
    expect(tables.phases.some((c) => c.name === 'registry_version')).toBe(true)
  })

  it('baseline DDL: registry_versions ПЕРЕД patients/phases + сид v1', () => {
    const ddl = generateD1Schema()
    expect(ddl).toContain(REGISTRY_VERSIONS_DDL.split('\n')[0])
    expect(ddl).toContain(
      `"registry_version" INTEGER NOT NULL DEFAULT ${REGISTRY_CURRENT_VERSION} REFERENCES registry_versions(version)`
    )
    expect(ddl).toContain(REGISTRY_VERSIONS_SEED)
    const idxVersions = ddl.indexOf('CREATE TABLE registry_versions')
    const idxPatients = ddl.indexOf('CREATE TABLE patients')
    const idxPhases = ddl.indexOf('CREATE TABLE phases')
    // FK patients/phases.registry_version → registry_versions: порядок важен
    expect(idxVersions).toBeGreaterThanOrEqual(0)
    expect(idxVersions).toBeLessThan(idxPatients)
    expect(idxVersions).toBeLessThan(idxPhases)
  })

  it('add registry_version рендерится как NOT NULL DEFAULT + FK', () => {
    expect(
      renderOpSql({
        kind: 'add',
        table: 'phases',
        column: { name: 'registry_version', sqlType: 'INTEGER' },
      })
    ).toBe(
      `ALTER TABLE phases ADD COLUMN "registry_version" INTEGER NOT NULL ` +
        `DEFAULT ${REGISTRY_CURRENT_VERSION} REFERENCES registry_versions(version);`
    )
  })
})
