import { JWTAuthentication, type AuthStrategy } from 'payload'
import { cookieToken, secretHash } from './primitives'

export const familyStrategy: AuthStrategy = {
  name: 'family-email-session',
  authenticate: async (args) => {
    // Preserve the existing administrator login when both cookies are present.
    const admin = await JWTAuthentication({ ...args, strategyName: 'local-jwt' })
    if (admin.user?.collection === 'administrators') return admin
    const { payload, headers } = args
    const token = cookieToken(headers, payload.config.cookiePrefix)
    if (!token) return { user: null }
    const session = (
      await payload.find({
        collection: 'family-sessions',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: {
          and: [
            { tokenHash: { equals: secretHash(payload.secret, 'session', token) } },
            { expiresAt: { greater_than: new Date().toISOString() } },
          ],
        },
      })
    ).docs[0]
    if (!session) return { user: null }
    const memberId = typeof session.member === 'object' ? session.member.id : session.member
    const member = (
      await payload.find({
        collection: 'family-members',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: { id: { equals: memberId } },
      })
    ).docs[0]
    if (!member || member.status !== 'active' || member.authVersion !== session.authVersion)
      return { user: null }
    const { id, name, email, status, authVersion, createdAt, updatedAt } = member
    return {
      user: {
        id,
        name,
        email,
        status,
        authVersion,
        createdAt,
        updatedAt,
        collection: 'family-members',
        _strategy: 'family-email-session',
      },
    }
  },
}
