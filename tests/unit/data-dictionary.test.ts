import { describe, expect, it } from 'vitest'
import { buildDataDictionary } from '@/shared/lib/registry/data-dictionary'
import { FLAT_REGISTRY } from '@/shared/config/registry'
import { fieldLabel, optionLabel, pickLocale, resolveLocale, toIntlLocale } from '@/shared/lib/intl'
import { dictFor } from '@/shared/lib/intl/dictionaries'
import type { RegistryField } from '@/shared/config/registry/types'

describe('buildDataDictionary', () => {
  const sections = buildDataDictionary()

  it('покрывает все 6 разделов реестра и все поля FLAT_REGISTRY', () => {
    expect(sections.map((s) => s.key).sort()).toEqual(
      ['diagnostic', 'patient', 'phase', 'remission', 'status', 'therapy'].sort()
    )
    const ids = sections.flatMap((s) => s.entries.map((e) => e.id))
    expect(new Set(ids).size).toBe(Object.keys(FLAT_REGISTRY).length)
  })

  it('вычисляемые поля не имеют колонки в БД, остальные — patients/phases по scope', () => {
    const all = sections.flatMap((s) => s.entries)
    for (const e of all) {
      const field = (FLAT_REGISTRY as unknown as Record<string, Record<string, unknown>>)[e.id]
      if (field.calculate) expect(e.storage).toBeNull()
      else expect(['patients', 'phases']).toContain(e.storage)
    }
    const ageGroup = all.find((e) => e.id === 'age_group')
    expect(ageGroup?.allowed).toContain('до 50 лет')
    const hamd = all.find((e) => e.id === 'hamd_total')
    expect(hamd?.allowed).toBe('от 0 до 52')
  })

  it('deprecated_since/replacedBy пробрасывается в словарь (docs/schema-evolution.md §6, §3.1)', () => {
    const all = sections.flatMap((s) => s.entries)
    // Пока deprecated-полей нет: все записи — null, поля присутствуют
    for (const e of all) {
      expect('deprecatedSince' in e).toBe(true)
      expect(e.deprecatedSince).toBeNull()
      expect('replacedBy' in e).toBe(true)
      expect(e.replacedBy).toBeNull()
    }
  })
})

describe('i18n: registry labels + dictionaries (docs/en/i18n.md)', () => {
  it('все поля реестра имеют en-подпись (строка или {ru,en})', () => {
    const missing = Object.values(FLAT_REGISTRY).filter((f) => {
      const field = f as RegistryField
      if (typeof field.label === 'string') return field.label.trim() === ''
      return !field.label.en || !field.label.ru
    })
    expect(missing).toEqual([])
  })

  it('все опции реестра имеют en-подпись', () => {
    const bad: string[] = []
    for (const f of Object.values(FLAT_REGISTRY) as RegistryField[]) {
      for (const o of f.options ?? []) {
        if (typeof o.label === 'string') {
          if (o.label.trim() === '') bad.push(`${f.id}:${o.value}`)
        } else if (!o.label.en || !o.label.ru) bad.push(`${f.id}:${o.value}`)
      }
    }
    expect(bad).toEqual([])
  })

  it('fieldLabel/optionLabel: en + RU-фолбэк на строке', () => {
    const field = {
      id: 'x',
      label: { ru: 'Тоска', en: 'Melancholy' },
      ui: 'checkbox',
    } as RegistryField
    expect(fieldLabel(field, 'en')).toBe('Melancholy')
    expect(fieldLabel(field, 'ru')).toBe('Тоска')
    expect(fieldLabel({ ...field, label: 'Просто строка' }, 'en')).toBe('Просто строка')
    expect(optionLabel({ value: 1, label: { ru: 'Нет', en: 'None' } }, 'en')).toBe('None')
  })

  it('pickLocale/resolveLocale/toIntlLocale', () => {
    expect(pickLocale({ ru: 'а', en: 'b' }, 'en')).toBe('b')
    expect(resolveLocale('xx')).toBe('ru')
    expect(resolveLocale('en')).toBe('en')
    expect(toIntlLocale('en')).toBe('en-US')
    expect(toIntlLocale('ru')).toBe('ru-RU')
  })

  it('словари en/ru: одинаковые ключи неймспейсов', () => {
    const ru = dictFor('ru')
    const en = dictFor('en')
    expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort())
    for (const ns of Object.keys(ru) as Array<keyof typeof ru>) {
      expect(Object.keys(en[ns]).sort()).toEqual(Object.keys(ru[ns]).sort())
    }
  })

  it('buildDataDictionary(locale): en-заголовки и подписи отличаются от ru', () => {
    const ruSecs = buildDataDictionary('ru')
    const enSecs = buildDataDictionary('en')
    expect(enSecs.map((s) => s.key)).toEqual(ruSecs.map((s) => s.key))
    const ruTherapy = ruSecs.find((s) => s.key === 'therapy')!
    const enTherapy = enSecs.find((s) => s.key === 'therapy')!
    expect(enTherapy.title).not.toBe(ruTherapy.title)
    const enOpt = enTherapy.entries.find((e) => e.id === 'ad_snri')!
    expect(enOpt.label).toBe('SNRI')
    const ruPatient = ruSecs.find((s) => s.key === 'patient')!
    const ageGroup = ruPatient.entries.find((e) => e.id === 'age_group')!
    expect(ageGroup.allowed).toContain('до 50 лет')
  })
})
