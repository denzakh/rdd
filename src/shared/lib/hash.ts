/**
 * Минимальный createHash на Web Crypto (работает в Workers и Node >= 18).
 * Почему не node:crypto — рантайм Cloudflare Workers (opennext, nodejs_compat
 * не гарантирует синхронный crypto API в edge-частях, например middleware).
 */

const enc = new TextEncoder()

const toHex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')

export type SupportedHash = 'sha-256'

export async function createHash(algorithm: SupportedHash, input: string): Promise<string> {
  const digest = await crypto.subtle.digest(algorithm.toUpperCase(), enc.encode(input))
  return toHex(digest)
}
