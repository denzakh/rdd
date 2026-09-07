import { describe, expect, it } from 'vitest'
import {
  generatePassword,
  hashPassword,
  PBKDF2_ITERATIONS,
  verifyPassword,
} from '@/shared/lib/password'

describe('password: hashPassword', () => {
  it('формат pbkdf2$<iterations>$<salt-hex>$<hash-hex>', async () => {
    const hash = await hashPassword('секретный-пароль')
    const parts = hash.split('$')
    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('pbkdf2')
    expect(Number(parts[1])).toBe(PBKDF2_ITERATIONS)
    expect(parts[2]).toMatch(/^[0-9a-f]{32}$/) // соль 16 байт
    expect(parts[3]).toMatch(/^[0-9a-f]{64}$/) // ключ 32 байта
  })

  it('соль уникальна — два хэша одного пароля не совпадают', async () => {
    const [a, b] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')])
    expect(a).not.toBe(b)
  })
})

describe('password: verifyPassword', () => {
  it('верный пароль проходит', async () => {
    const hash = await hashPassword('correct-horse-battery')
    await expect(verifyPassword('correct-horse-battery', hash)).resolves.toBe(true)
  })

  it('неверный пароль отклоняется', async () => {
    const hash = await hashPassword('correct-horse-battery')
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false)
  })

  it('битые/чужие форматы хэша отклоняются без исключений', async () => {
    await expect(verifyPassword('x', '')).resolves.toBe(false)
    await expect(verifyPassword('x', 'bcrypt$foo')).resolves.toBe(false)
    await expect(verifyPassword('x', 'pbkdf2$abc$zz$00')).resolves.toBe(false)
    await expect(verifyPassword('x', 'pbkdf2$0$00$00')).resolves.toBe(false)
  })

  it('кастомное число итераций сохраняется в хэше и верифицируется', async () => {
    const hash = await hashPassword('iter-password', 1000)
    expect(hash.startsWith('pbkdf2$1000$')).toBe(true)
    await expect(verifyPassword('iter-password', hash)).resolves.toBe(true)
  })

  it('sanity-тайминг: неверный пароль не быстрее верного на порядки', async () => {
    const hash = await hashPassword('timing-check-password')
    const t = async (pw: string) => {
      const start = performance.now()
      await verifyPassword(pw, hash)
      return performance.now() - start
    }
    const good = await t('timing-check-password')
    const bad = await t('wrong-timing-password')
    // оба проходят полный PBKDF2; допускаем 10x разброс на шумном CI
    expect(bad).toBeGreaterThan(good / 10)
    expect(good).toBeGreaterThan(bad / 10)
  })
})

describe('password: generatePassword', () => {
  it('16 символов base64url, без +/=', () => {
    for (let i = 0; i < 20; i++) {
      const pw = generatePassword()
      expect(pw).toMatch(/^[A-Za-z0-9_-]{16}$/)
    }
  })

  it('значения различаются', () => {
    expect(generatePassword()).not.toBe(generatePassword())
  })
})
