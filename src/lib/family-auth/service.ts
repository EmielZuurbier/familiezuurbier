import {
  APIError,
  createLocalReq,
  type Payload,
  type PayloadRequest,
  type TypedUser,
} from 'payload'
import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres/drizzle'
import { mailConfigured } from './mail'
import {
  appOrigin,
  CODE_LIFETIME,
  equalHash,
  INVITE_LIFETIME,
  loginCode,
  MAX_CODE_ATTEMPTS,
  normalizeEmail,
  opaqueToken,
  secretHash,
} from './primitives'

type Actor = Pick<TypedUser, 'id' | 'collection'> | null
const nowISO = () => new Date().toISOString()
function assertAdmin(actor: Actor) {
  if (actor?.collection !== 'administrators')
    throw new APIError('Alleen beheerders kunnen familietoegang wijzigen.', 403)
}
function requireMail() {
  if (!mailConfigured())
    throw new APIError(
      'Inloggen per e-mail is nog niet geactiveerd. De beheerder moet eerst een e-maildienst aansluiten.',
      503,
    )
}
async function atomic<T>(
  payload: Payload,
  action: (req: PayloadRequest) => Promise<T>,
): Promise<T> {
  const req = await createLocalReq({}, payload)
  req.transactionID = (await payload.db.beginTransaction()) ?? undefined
  if (!req.transactionID) throw new Error('Familietoegang vereist een databasetransactie.')
  try {
    const db = payload.db as unknown as PostgresAdapter
    const tx = await req.transactionID
    await db.sessions[tx].db.execute(sql`SELECT pg_advisory_xact_lock(1947162027)`)
    await payload.delete({
      collection: 'family-rate-limits',
      where: { expiresAt: { less_than: nowISO() } },
      overrideAccess: true,
      req,
    })
    const result = await action(req)
    await payload.db.commitTransaction(req.transactionID)
    return result
  } catch (error) {
    await payload.db.rollbackTransaction(req.transactionID)
    throw error
  }
}
async function limit(
  payload: Payload,
  req: PayloadRequest,
  name: string,
  maximum: number,
  window: number,
) {
  const key = secretHash(payload.secret, 'rate-limit', name)
  const row = (
    await payload.find({
      collection: 'family-rate-limits',
      where: { key: { equals: key } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
      req,
    })
  ).docs[0]
  if (row && row.count >= maximum) return false
  if (row)
    await payload.update({
      collection: 'family-rate-limits',
      id: row.id,
      data: { count: row.count + 1 },
      overrideAccess: true,
      req,
    })
  else
    await payload.create({
      collection: 'family-rate-limits',
      data: { key, count: 1, expiresAt: new Date(Date.now() + window).toISOString() },
      overrideAccess: true,
      req,
    })
  return true
}
async function findEmail(payload: Payload, email: string, req: PayloadRequest) {
  return (
    await payload.find({
      collection: 'family-members',
      showHiddenFields: true,
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
  ).docs[0]
}

export async function inviteMember(
  payload: Payload,
  actor: Actor,
  nameValue: unknown,
  emailValue: unknown,
) {
  assertAdmin(actor)
  requireMail()
  const email = normalizeEmail(emailValue),
    name = typeof nameValue === 'string' ? nameValue.trim() : ''
  if (!email || !name || name.length > 120 || /[\r\n]/.test(name))
    throw new APIError('Vul een naam en geldig e-mailadres in.', 400)
  const token = opaqueToken(),
    hash = secretHash(payload.secret, 'invite', token)
  const invitationURL = `${appOrigin()}/inloggen#uitnodiging=${encodeURIComponent(token)}`
  const member = await atomic(payload, async (req) => {
    const existing = await findEmail(payload, email, req)
    if (existing?.status === 'active') throw new APIError('Deze persoon heeft al toegang.', 409)
    if (!(await limit(payload, req, `invite:${email}`, 1, 60_000)))
      throw new APIError('Wacht een minuut voordat je opnieuw uitnodigt.', 429)
    const data = {
      name,
      email,
      status: 'invited' as const,
      authVersion: (existing?.authVersion ?? 0) + 1,
      inviteHash: hash,
      inviteExpiresAt: new Date(Date.now() + INVITE_LIFETIME).toISOString(),
      codeHash: null,
      codeExpiresAt: null,
      codeAttempts: 0,
      invitedAt: null,
      mailFailed: false,
    }
    return existing
      ? payload.update({
          collection: 'family-members',
          showHiddenFields: true,
          id: existing.id,
          data,
          overrideAccess: true,
          req,
        })
      : payload.create({
          collection: 'family-members',
          showHiddenFields: true,
          data,
          overrideAccess: true,
          req,
        })
  })
  let sent = false
  try {
    await payload.sendEmail({
      to: email,
      subject: 'Je bent uitgenodigd voor de stamboom van de familie Zuurbier',
      text: `Je bent uitgenodigd om de besloten stamboom en familiekaart van de familie Zuurbier te bekijken.\n\nAccepteer de uitnodiging binnen zeven dagen:\n${invitationURL}\n\nDaarna log je in met een eenmalige code per e-mail. Je krijgt alleen kijkrechten.\n\nVerwachtte je deze uitnodiging niet? Dan kun je deze e-mail negeren.`,
    })
    sent = true
  } finally {
    await atomic(payload, async (req) => {
      const current = await payload.findByID({
        collection: 'family-members',
        showHiddenFields: true,
        id: member.id,
        overrideAccess: true,
        req,
      })
      if (current.inviteHash === hash)
        await payload.update({
          collection: 'family-members',
          showHiddenFields: true,
          id: member.id,
          data: sent
            ? { invitedAt: nowISO() }
            : { inviteHash: null, inviteExpiresAt: null, mailFailed: true },
          overrideAccess: true,
          req,
        })
    })
  }
  return member.id
}

export async function acceptInvitation(payload: Payload, token: unknown, ip: string) {
  requireMail()
  const result = await atomic(payload, async (req) => {
    if (
      !(await limit(payload, req, `accept:${ip}`, 30, 15 * 60_000)) ||
      typeof token !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(token)
    )
      return null
    const member = (
      await payload.find({
        collection: 'family-members',
        showHiddenFields: true,
        where: {
          and: [
            { status: { equals: 'invited' } },
            { inviteHash: { equals: secretHash(payload.secret, 'invite', token) } },
            { inviteExpiresAt: { greater_than: nowISO() } },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      })
    ).docs[0]
    if (!member) return null
    await payload.update({
      collection: 'family-members',
      showHiddenFields: true,
      id: member.id,
      data: { status: 'active', activatedAt: nowISO(), inviteHash: null, inviteExpiresAt: null },
      overrideAccess: true,
      req,
    })
    return member.email
  })
  if (!result)
    throw new APIError(
      'Deze uitnodiging is verlopen of niet meer geldig. Vraag de beheerder om een nieuwe uitnodiging.',
      400,
    )
  return result
}

export async function requestCode(payload: Payload, emailValue: unknown, ip: string) {
  requireMail()
  const email = normalizeEmail(emailValue)
  if (!email) throw new APIError('Vul een geldig e-mailadres in.', 400)
  const ticket = await atomic(payload, async (req) => {
    if (!(await limit(payload, req, `request:${ip}`, 60, 15 * 60_000))) return null
    const member = await findEmail(payload, email, req)
    if (
      !member ||
      member.status !== 'active' ||
      (member.codeSentAt && Date.now() - new Date(member.codeSentAt).getTime() < 60_000)
    )
      return null
    if (!(await limit(payload, req, `request-email:${email}`, 5, 60 * 60_000))) return null
    const code = loginCode(),
      hash = secretHash(payload.secret, `code:${member.id}`, code)
    await payload.update({
      collection: 'family-members',
      showHiddenFields: true,
      id: member.id,
      data: {
        codeHash: hash,
        codeExpiresAt: new Date(Date.now() + CODE_LIFETIME).toISOString(),
        codeAttempts: 0,
        codeSentAt: nowISO(),
        mailFailed: false,
      },
      overrideAccess: true,
      req,
    })
    return { memberId: member.id, email: member.email, hash, code }
  })
  // Route handlers deliver after the generic response, so mailbox existence and
  // SMTP response times do not reveal which email addresses have an account.
  return {
    deliver: ticket
      ? async () => {
          try {
            await payload.sendEmail({
              to: ticket.email,
              subject: 'Je inlogcode voor de familie Zuurbier',
              text: `Je eenmalige inlogcode is: ${ticket.code}\n\nDeze code is tien minuten geldig en kan één keer worden gebruikt. Deel de code niet.\n\nHeb je geen code aangevraagd? Dan kun je deze e-mail negeren.`,
            })
          } catch {
            await atomic(payload, async (req) => {
              const member = await payload.findByID({
                collection: 'family-members',
                showHiddenFields: true,
                id: ticket.memberId,
                overrideAccess: true,
                req,
              })
              if (member.codeHash === ticket.hash)
                await payload.update({
                  collection: 'family-members',
                  showHiddenFields: true,
                  id: member.id,
                  data: { codeHash: null, codeExpiresAt: null, mailFailed: true },
                  overrideAccess: true,
                  req,
                })
            })
          }
        }
      : null,
  }
}

export async function verifyCode(
  payload: Payload,
  emailValue: unknown,
  codeValue: unknown,
  ip: string,
  remember = false,
) {
  const email = normalizeEmail(emailValue),
    code = typeof codeValue === 'string' ? codeValue.trim() : ''
  const result = await atomic(payload, async (req) => {
    if (!(await limit(payload, req, `verify:${ip}`, 60, 10 * 60_000)) || !email) return null
    const member = await findEmail(payload, email, req)
    if (
      !member ||
      member.status !== 'active' ||
      !member.codeHash ||
      !member.codeExpiresAt ||
      new Date(member.codeExpiresAt).getTime() <= Date.now() ||
      (member.codeAttempts ?? 0) >= MAX_CODE_ATTEMPTS
    )
      return null
    if (
      !/^\d{6}$/.test(code) ||
      !equalHash(member.codeHash, secretHash(payload.secret, `code:${member.id}`, code))
    ) {
      const attempts = (member.codeAttempts ?? 0) + 1
      await payload.update({
        collection: 'family-members',
        showHiddenFields: true,
        id: member.id,
        data: {
          codeAttempts: attempts,
          ...(attempts >= MAX_CODE_ATTEMPTS ? { codeHash: null, codeExpiresAt: null } : {}),
        },
        overrideAccess: true,
        req,
      })
      return null
    }
    const token = opaqueToken(),
      expiresAt = new Date(Date.now() + (remember ? 30 * 24 : 12) * 60 * 60_000).toISOString()
    await payload.update({
      collection: 'family-members',
      showHiddenFields: true,
      id: member.id,
      data: { codeHash: null, codeExpiresAt: null, codeAttempts: 0, lastLoginAt: nowISO() },
      overrideAccess: true,
      req,
    })
    await payload.delete({
      collection: 'family-sessions',
      where: { expiresAt: { less_than: nowISO() } },
      overrideAccess: true,
      req,
    })
    await payload.create({
      collection: 'family-sessions',
      data: {
        member: member.id,
        tokenHash: secretHash(payload.secret, 'session', token),
        authVersion: member.authVersion,
        expiresAt,
      },
      overrideAccess: true,
      req,
    })
    return { token, expiresAt }
  })
  // Throw only after committing: failed attempts must never roll back their counter.
  if (!result)
    throw new APIError(
      'De code is onjuist, verlopen of al gebruikt. Vraag zo nodig een nieuwe code aan.',
      401,
    )
  return result
}

export async function revokeMember(payload: Payload, actor: Actor, id: number) {
  assertAdmin(actor)
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new APIError('Kies een geldig familieaccount.', 400)
  await atomic(payload, async (req) => {
    const member = await payload.findByID({
      collection: 'family-members',
      showHiddenFields: true,
      id,
      overrideAccess: true,
      req,
    })
    await payload.update({
      collection: 'family-members',
      showHiddenFields: true,
      id,
      data: {
        status: 'revoked',
        authVersion: member.authVersion + 1,
        inviteHash: null,
        inviteExpiresAt: null,
        codeHash: null,
        codeExpiresAt: null,
      },
      overrideAccess: true,
      req,
    })
    await payload.delete({
      collection: 'family-sessions',
      where: { member: { equals: id } },
      overrideAccess: true,
      req,
    })
  })
}
export async function logoutSession(payload: Payload, token: string | null) {
  if (token)
    await payload.delete({
      collection: 'family-sessions',
      where: { tokenHash: { equals: secretHash(payload.secret, 'session', token) } },
      overrideAccess: true,
    })
}
export async function listMembers(payload: Payload, actor: Actor) {
  assertAdmin(actor)
  const members = await payload.find({
    collection: 'family-members',
    showHiddenFields: true,
    depth: 0,
    pagination: false,
    sort: 'name',
    overrideAccess: true,
  })
  return members.docs.map(({ id, name, email, status, invitedAt, lastLoginAt, mailFailed }) => ({
    id,
    name,
    email,
    status,
    invitedAt,
    lastLoginAt,
    mailFailed,
  }))
}
