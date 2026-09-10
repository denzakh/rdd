/**
 * Хэширование и проверка паролей через Web Crypto (PBKDF2-SHA256).
 *
 * Работает и в Cloudflare Workers, и в Node (>=18: crypto.subtle — глобальный),
 * поэтому один и тот же код используется в рантайме приложения и в
 * scripts/create-user.ts. Никаких внешних зависимостей.
 *
 * Формат хэша: pbkdf2$<iterations>$<salt-hex>$<hash-hex>
 * Итерации и соль хранятся в самой строке — параметр можно повышать,
 * старые хэши продолжат верифицироваться.
 */

export const PBKDF2_ITERATIONS = 600_000
const SHA256_BYTES = 32 // 256 бит
const SALT_BYTES = 16

const enc = new TextEncoder()

const toHex = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

const fromHex = (hex: string): Uint8Array => {
  if (!/^[0-9a-f]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error('Ожидается hex-строка чётной длины')
  }
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    SHA256_BYTES * 8
  )
}

export const MIN_PASSWORD_LENGTH = 10

/** Генерация пароля: 12 случайных байт base64url (16 символов), показывается один раз. */
export const generatePassword = (): string => {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** Хэширует пароль в самодостаточную строку для колонки users.password_hash. */
export async function hashPassword(
  password: string,
  iterations = PBKDF2_ITERATIONS
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const bits = await deriveBits(password, salt, iterations)
  return `pbkdf2$${iterations}$${toHex(salt)}$${toHex(bits)}`
}

/**
 * Проверяет пароль против хэша формата pbkdf2$...$...$...
 * Сравнение постоянного времени (constant-time), чтобы не утечь по таймингу.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = Number(parts[1])
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 10_000_000) return false

  try {
    const salt = fromHex(parts[2])
    const expected = fromHex(parts[3])
    const actual = new Uint8Array(await deriveBits(password, salt, iterations))
    if (actual.length !== expected.length) return false
    let diff = 0
    for (let i = 0; i < expected.length; i++) diff |= actual[i]! ^ expected[i]!
    return diff === 0
  } catch {
    return false
  }
}
