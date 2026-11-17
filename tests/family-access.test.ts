import { afterEach, describe, expect, it, vi } from 'vitest'
import { appOrigin, cookieName, cookieToken, sameOrigin } from '../src/lib/family-auth/primitives'
import { administrator, familyRead } from '../src/collections/access'
import type { PayloadRequest } from 'payload'

afterEach(() => vi.unstubAllEnvs())
const request = (origin?: string) =>
  new Request('https://familie.example/api/familie/invite', { headers: origin ? { origin } : {} })
const access = (user: unknown) => ({ req: { user } as PayloadRequest })
describe('Grenzen van familietoegang', () => {
  it('weigert ontbrekende en vreemde herkomsten voor alle accountwijzigingen', () => {
    vi.stubEnv('FAMILY_APP_URL', 'https://familie.example')
    expect(sameOrigin(request())).toBe(false)
    expect(sameOrigin(request('https://vreemd.example'))).toBe(false)
    expect(sameOrigin(request('https://familie.example.vreemd.example'))).toBe(false)
    expect(sameOrigin(request('null'))).toBe(false)
    expect(sameOrigin(request('https://familie.example'))).toBe(true)
  })
  it('vereist een beveiligde uitnodigingswebsite buiten lokale ontwikkeling', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('FAMILY_APP_URL', 'http://familie.example')
    expect(() => appOrigin()).toThrow()
    vi.stubEnv('FAMILY_APP_URL', 'https://naam:wachtwoord@familie.example')
    expect(() => appOrigin()).toThrow()
    vi.stubEnv('FAMILY_APP_URL', 'https://familie.example')
    expect(appOrigin()).toBe('https://familie.example')
    expect(sameOrigin(request('http://familie.example'))).toBe(false)
  })
  it('laat alleen tijdens lokale ontwikkeling de eigen lokale herkomst toe', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('FAMILY_APP_URL', 'http://127.0.0.1:3000')
    expect(
      sameOrigin(
        new Request('http://localhost:3000/api/familie/request-code', {
          headers: { origin: 'http://localhost:3000' },
        }),
      ),
    ).toBe(true)
    expect(
      sameOrigin(
        new Request('http://localhost:3000/api/familie/request-code', {
          headers: { origin: 'http://localhost:3001' },
        }),
      ),
    ).toBe(false)
  })
  it('neemt geen vervalste of verkeerd benoemde familiesessie over', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const name = cookieName('familieboom'),
      token = 'a'.repeat(43)
    expect(name).toMatch(/^__Host-/)
    expect(cookieToken(new Headers({ cookie: `${name}=${token}` }), 'familieboom')).toBe(token)
    expect(cookieToken(new Headers({ cookie: `${name}=te-kort` }), 'familieboom')).toBeNull()
    expect(cookieToken(new Headers({ cookie: `andere-sessie=${token}` }), 'familieboom')).toBeNull()
  })
  it('herkent het lokale browseradres wanneer Next het interne adres normaliseert', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('FAMILY_APP_URL', 'http://localhost:3000')
    expect(
      sameOrigin(
        new Request('http://localhost:3000/api/familie/request-code', {
          headers: { origin: 'http://127.0.0.1:3000', host: '127.0.0.1:3000' },
        }),
      ),
    ).toBe(true)
    expect(
      sameOrigin(
        new Request('http://localhost:3000/api/familie/request-code', {
          headers: { origin: 'http://127.0.0.1:3001', host: '127.0.0.1:3000' },
        }),
      ),
    ).toBe(false)
  })
  it('opent opgeslagen persoonsgegevens nooit met de oude publieke instelling', () => {
    vi.stubEnv('PUBLIC_FAMILY_READ', 'true')
    expect(familyRead(access(null))).toBe(false)
    expect(familyRead(access({ collection: 'family-members', status: 'invited' }))).toBe(false)
    expect(familyRead(access({ collection: 'family-members', status: 'revoked' }))).toBe(false)
    expect(familyRead(access({ collection: 'family-members', status: 'active' }))).toBe(true)
  })
  it('houdt beheerdersrechten gescheiden van actieve familieaccounts', () => {
    expect(administrator(access({ collection: 'family-members', status: 'active' }))).toBe(false)
    expect(administrator(access({ collection: 'administrators' }))).toBe(true)
    expect(familyRead(access({ collection: 'administrators' }))).toBe(true)
  })
})
