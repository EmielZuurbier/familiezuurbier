import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

export const CODE_LIFETIME = 10 * 60_000
export const INVITE_LIFETIME = 7 * 24 * 60 * 60_000
export const MAX_CODE_ATTEMPTS = 5
export function opaqueToken() {
  return randomBytes(32).toString('base64url')
}
export function loginCode() {
  return String(randomInt(100000, 1000000))
}
export function secretHash(secret: string, purpose: string, value: string) {
  return createHmac('sha256', secret).update(`${purpose}:${value}`).digest('hex')
}
export function equalHash(a: string | null | undefined, b: string) {
  return (
    !!a && /^[a-f0-9]{64}$/.test(a) && timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  )
}
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return email.length <= 254 &&
    !/[\x00-\x1f\x7f]/.test(email) &&
    /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
    ? email
    : null
}
export function cookieName(prefix: string) {
  return `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}${prefix}-family-session`
}
export function cookieToken(headers: Headers, prefix: string) {
  const entry = (headers.get('cookie') ?? '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${cookieName(prefix)}=`))
  const token = entry?.slice(entry.indexOf('=') + 1)
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null
}
export function appOrigin() {
  const value = process.env.FAMILY_APP_URL || process.env.NEXT_PUBLIC_SERVER_URL
  if (!value) throw new Error('Stel eerst het websiteadres in.')
  const url = new URL(value)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (
    url.username ||
    url.password ||
    (url.protocol !== 'https:' &&
      !(process.env.NODE_ENV !== 'production' && local && url.protocol === 'http:'))
  )
    throw new Error('Gebruik een beveiligd websiteadres.')
  return url.origin
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    if (origin === appOrigin()) return true
    const url = new URL(request.url)
    const source = new URL(origin)
    const localHosts = ['127.0.0.1', 'localhost', '[::1]']
    const host = request.headers.get('host')
    return (
      process.env.NODE_ENV !== 'production' &&
      localHosts.includes(url.hostname) &&
      localHosts.includes(source.hostname) &&
      source.protocol === url.protocol &&
      source.port === url.port &&
      (host ? host === source.host : origin === url.origin)
    )
  } catch {
    return false
  }
}
