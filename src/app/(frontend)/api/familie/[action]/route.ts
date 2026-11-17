import { after, NextResponse } from 'next/server'
import { APIError, getPayload } from 'payload'
import config from '@payload-config'
import { databaseConfigured } from '@/lib/settings'
import {
  acceptInvitation,
  inviteMember,
  logoutSession,
  requestCode,
  revokeMember,
  verifyCode,
} from '@/lib/family-auth/service'
import { cookieName, cookieToken, sameOrigin } from '@/lib/family-auth/primitives'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const genericMessage =
  'Als dit e-mailadres toegang heeft, ontvang je een inlogcode. Controleer ook je ongewenste e-mail.'
function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}
async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new APIError('Stuur een geldig formulier.', 400)
  const reader = request.body?.getReader()
  if (!reader) throw new APIError('Vul het formulier in.', 400)
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 4096) {
      await reader.cancel()
      throw new APIError('Het formulier is te groot.', 400)
    }
    chunks.push(value)
  }
  try {
    const data: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error()
    return data as Record<string, unknown>
  } catch {
    throw new APIError('Stuur een geldig formulier.', 400)
  }
}
function clientKey(request: Request) {
  // Forwarded addresses are trusted only behind an explicitly configured proxy.
  if (process.env.FAMILY_TRUST_PROXY === 'true') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    if (ip && /^[a-fA-F0-9:.]{1,64}$/.test(ip)) return ip
  }
  return 'site'
}
async function appPayload() {
  if (!databaseConfigured()) throw new APIError('De familieomgeving is nog niet ingesteld.', 503)
  return getPayload({ config })
}
export async function GET(request: Request, context: { params: Promise<{ action: string }> }) {
  if ((await context.params).action !== 'session')
    return json({ message: 'Deze handeling is niet beschikbaar.' }, 405)
  try {
    const payload = await appPayload(),
      { user } = await payload.auth({ headers: request.headers })
    return user ? json({ authenticated: true }) : json({ authenticated: false }, 401)
  } catch {
    return json({ message: 'De sessie kon niet worden gecontroleerd.' }, 503)
  }
}
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  if (!sameOrigin(request))
    return json({ message: 'Open het formulier op de familiewebsite en probeer opnieuw.' }, 403)
  try {
    const data = await body(request),
      { action } = await context.params,
      payload = await appPayload(),
      ip = clientKey(request)
    if (action === 'request-code') {
      const ticket = await requestCode(payload, data.email, ip)
      if (ticket.deliver) after(ticket.deliver)
      return json({ message: genericMessage })
    }
    if (action === 'accept-invitation') {
      const email = await acceptInvitation(payload, data.token, ip)
      const ticket = await requestCode(payload, email, ip)
      if (ticket.deliver) after(ticket.deliver)
      return json({ email, message: genericMessage })
    }
    if (action === 'verify-code') {
      const session = await verifyCode(payload, data.email, data.code, ip, data.remember === true)
      const response = json({ message: 'Je bent ingelogd.' })
      response.cookies.set(cookieName(payload.config.cookiePrefix), session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: new Date(session.expiresAt),
      })
      return response
    }
    if (action === 'logout') {
      await logoutSession(payload, cookieToken(request.headers, payload.config.cookiePrefix))
      const response = json({ message: 'Je bent uitgelogd.' })
      response.cookies.set(cookieName(payload.config.cookiePrefix), '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      })
      return response
    }
    const { user } = await payload.auth({ headers: request.headers })
    if (user?.collection !== 'administrators')
      return json({ message: 'Alleen beheerders kunnen familietoegang wijzigen.' }, 403)
    if (action === 'invite') {
      await inviteMember(payload, user, data.name, data.email)
      return json({ message: 'De persoonlijke uitnodiging is verstuurd.' })
    }
    if (action === 'revoke') {
      await revokeMember(payload, user, typeof data.id === 'number' ? data.id : NaN)
      return json({
        message: 'De toegang is ingetrokken. Bestaande sessies en uitnodigingen zijn ongeldig.',
      })
    }
    return json({ message: 'Deze handeling bestaat niet.' }, 404)
  } catch (error) {
    if (error instanceof APIError && [400, 401, 403, 409, 429, 503].includes(error.status))
      return json({ message: error.message }, error.status)
    return json(
      { message: 'De aanvraag kon niet worden verwerkt. Probeer het later opnieuw.' },
      500,
    )
  }
}
