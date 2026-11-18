import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  getPayload: vi.fn(),
  count: vi.fn(),
  auth: vi.fn(),
  find: vi.fn(),
}))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
import { loadFamily, examplesAvailable } from '../src/lib/load-family'

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('DATABASE_URL', 'postgresql://unused:unused@localhost/unused')
  vi.stubEnv('PAYLOAD_SECRET', 'x'.repeat(32))
  vi.stubEnv('FAMILY_DATA_MODE', 'demo')
  mocks.getPayload.mockResolvedValue({ count: mocks.count, auth: mocks.auth, find: mocks.find })
  mocks.count.mockResolvedValue({ totalDocs: 1 })
  mocks.auth.mockResolvedValue({ user: null })
})
afterEach(() => vi.unstubAllEnvs())

describe('Voorbeelden alleen zonder opgeslagen personen', () => {
  it('toont op een nieuwe installatie zonder database uitsluitend de vaste voorbeelden', async () => {
    vi.stubEnv('DATABASE_URL', '')
    expect(await loadFamily()).toMatchObject({ kind: 'ready', demo: true, persistent: false })
    expect(await examplesAvailable()).toBe(true)
    expect(mocks.getPayload).not.toHaveBeenCalled()
  })
  it('gebruikt voorbeelden bij een verbonden, lege database zonder records aan te maken', async () => {
    mocks.count.mockResolvedValue({ totalDocs: 0 })
    const result = await loadFamily()
    expect(result).toMatchObject({ kind: 'ready', demo: true, persistent: false })
    expect(await examplesAvailable()).toBe(true)
    expect(mocks.count).toHaveBeenCalledWith({ collection: 'people', overrideAccess: true })
    expect(mocks.find).not.toHaveBeenCalled()
    expect(mocks.auth).not.toHaveBeenCalled()
  })
  it('verbergt voorbeelden zodra één persoon bestaat, ook met de oude demo-instelling', async () => {
    expect(await loadFamily()).toEqual({ kind: 'private' })
    expect(await examplesAvailable()).toBe(false)
    expect(mocks.find).not.toHaveBeenCalled()
  })
  it('laat een beheerder of actief familielid de opgeslagen gegevens lezen met toegangscontrole', async () => {
    for (const user of [
      { collection: 'administrators', id: 1 },
      { collection: 'family-members', id: 2, status: 'active' },
    ]) {
      mocks.auth.mockResolvedValue({ user })
      mocks.find.mockImplementation(async ({ collection }) => ({
        docs:
          collection === 'people'
            ? [
                {
                  id: 1,
                  name: 'Opgeslagen testpersoon',
                  birth: { year: 1980 },
                  birthPlace: 'Haarlem',
                  currentResidence: 'Leiden',
                  deathPlace: 'Legacyplaats die niet meer zichtbaar mag zijn',
                  lifeStatus: 'unknown',
                },
              ]
            : [],
      }))
      const result = await loadFamily()
      expect(result).toMatchObject({
        kind: 'ready',
        demo: false,
        persistent: true,
        family: { people: [{ name: 'Opgeslagen testpersoon' }] },
      })
      if (result.kind === 'ready') {
        expect(result.family.people[0]).not.toHaveProperty('deathPlace')
        expect(result.family.people[0]).toMatchObject({
          birthPlace: 'Haarlem',
          currentResidence: 'Leiden',
        })
      }
      for (const [query] of mocks.find.mock.calls)
        expect(query).toMatchObject({ overrideAccess: false, user })
      mocks.find.mockClear()
    }
  })
  it('houdt ingetrokken familieaccounts en onbekende accounts buiten de eigen stamboom', async () => {
    for (const user of [
      { collection: 'family-members', status: 'revoked' },
      { collection: 'other' },
    ]) {
      mocks.auth.mockResolvedValue({ user })
      expect(await loadFamily()).toEqual({ kind: 'private' })
    }
    expect(mocks.find).not.toHaveBeenCalled()
  })
  it('toont bij ontbrekende sleutels of databasefouten geen vervangende voorbeeldstamboom', async () => {
    vi.stubEnv('PAYLOAD_SECRET', '')
    expect(await loadFamily()).toEqual({ kind: 'setup' })
    expect(await examplesAvailable()).toBe(false)
    vi.stubEnv('PAYLOAD_SECRET', 'x'.repeat(32))
    mocks.count.mockRejectedValue(new Error('Niet bereikbaar'))
    expect(await loadFamily()).toEqual({ kind: 'error' })
    expect(await examplesAvailable()).toBe(false)
    mocks.getPayload.mockRejectedValue(new Error('Verbinding mislukt'))
    expect(await loadFamily()).toEqual({ kind: 'error' })
  })
  it('controleert de vulling opnieuw en houdt de eerste invoer niet verborgen achter een oude demo', async () => {
    mocks.count.mockResolvedValueOnce({ totalDocs: 0 }).mockResolvedValue({ totalDocs: 1 })
    expect(await examplesAvailable()).toBe(true)
    expect(await examplesAvailable()).toBe(false)
    expect(await loadFamily()).toEqual({ kind: 'private' })
  })
})
