import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION_TTL_HOURS } from '@/shared/api/session-repo'
import { isSecureRequest, sessionCookieOptions } from '@/shared/api/session-cookie'
import { generatePassword, MIN_PASSWORD_LENGTH } from '@/shared/lib/password'

/** Заголовки текущего «запроса» — мок next/headers. */
let currentHeaders: Headers = new Headers()
vi.mock('next/headers', () => ({ headers: async () => currentHeaders }))

beforeEach(() => {
  currentHeaders = new Headers()
})

describe('password: политика длины', () => {
  it('минимум 8 символов', () => {
    // Политика из docs/ru/auth.md §4. Смена значения — осознанное решение,
    // здесь ловим случайный возврат к старым 10.
    expect(MIN_PASSWORD_LENGTH).toBe(8)
  })

  it('сгенерированный пароль длиннее минимума', () => {
    for (let i = 0; i < 10; i++) {
      expect(generatePassword().length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH)
    }
  })
})

describe('session-cookie: isSecureRequest', () => {
  it('http без прокси → secure: false (иначе браузер отбросит cookie)', async () => {
    await expect(isSecureRequest()).resolves.toBe(false)
  })

  it('x-forwarded-proto: https → true', async () => {
    currentHeaders = new Headers({ 'x-forwarded-proto': 'https' })
    await expect(isSecureRequest()).resolves.toBe(true)
  })

  it('x-forwarded-proto: http → false', async () => {
    currentHeaders = new Headers({ 'x-forwarded-proto': 'http' })
    await expect(isSecureRequest()).resolves.toBe(false)
  })

  it('цепочка прокси — берётся первый протокол', async () => {
    currentHeaders = new Headers({ 'x-forwarded-proto': 'https, http' })
    await expect(isSecureRequest()).resolves.toBe(true)
  })

  it('upgrade: https без x-forwarded-proto → true', async () => {
    currentHeaders = new Headers({ upgrade: 'HTTPS' })
    await expect(isSecureRequest()).resolves.toBe(true)
  })
})

describe('session-cookie: sessionCookieOptions', () => {
  it('httpOnly, lax, path и TTL выставлены всегда', async () => {
    const opts = await sessionCookieOptions()
    expect(opts.httpOnly).toBe(true)
    expect(opts.sameSite).toBe('lax')
    expect(opts.path).toBe('/')
    expect(opts.maxAge).toBe(SESSION_TTL_HOURS * 3600)
  })

  it('secure: false по http — регрессия локального входа', async () => {
    await expect(sessionCookieOptions()).resolves.toMatchObject({ secure: false })
  })

  it('secure: true по https', async () => {
    currentHeaders = new Headers({ 'x-forwarded-proto': 'https' })
    await expect(sessionCookieOptions()).resolves.toMatchObject({ secure: true })
  })
})
