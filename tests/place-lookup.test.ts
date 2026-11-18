import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookupPlace, searchablePlace } from '../src/lib/place-lookup'

const feature = (
  id = 'haarlem',
  name = 'Haarlem',
  label = 'Haarlem, Noord-Holland, Nederland',
) => ({
  geometry: { type: 'Point', coordinates: [4.64, 52.38] },
  properties: { mapbox_id: id, feature_type: 'place', name, full_address: label },
})
afterEach(() => vi.unstubAllGlobals())

describe('Tijdelijke plaatscontrole tijdens CMS-invoer', () => {
  it('vraagt pas bij bruikbare invoer om suggesties', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    for (const query of ['', '  ', 'Ha', 'a'.repeat(257), 'Haarlem;Nederland', 'een '.repeat(21)]) {
      expect(searchablePlace(query)).toBe(false)
      await expect(lookupPlace(query, 'pk.fictief', new AbortController().signal)).rejects.toThrow()
    }
    expect(fetch).not.toHaveBeenCalled()
  })
  it('zoekt alleen de plaatsinvoer op, tijdelijk en zonder cookies, caching of verwijzende CMS-URL', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ features: [feature()] }))
    vi.stubGlobal('fetch', fetch)
    const signal = new AbortController().signal
    const result = await lookupPlace('  Haarlem, Nederland  ', 'pk.fictief', signal)
    expect(result.matched?.name).toBe('Haarlem')
    const [url, options] = fetch.mock.calls[0]
    expect(new URL(url).searchParams.get('q')).toBe('Haarlem, Nederland')
    expect(new URL(url).searchParams.get('autocomplete')).toBe('true')
    expect(new URL(url).searchParams.get('permanent')).toBe('false')
    expect(options).toMatchObject({
      signal,
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'origin',
    })
  })
  it('geeft een aanvulsuggestie zonder een onvolledige invoer als bevestigd te tonen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ features: [feature()] })))
    const result = await lookupPlace('Haar', 'pk.fictief', new AbortController().signal)
    expect(result.candidates).toHaveLength(1)
    expect(result.matched).toBeNull()
  })
  it('kiest niet tussen gelijknamige plaatsen en verzint niets bij onbekende plaatsen', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          features: [feature(), feature('other', 'Haarlem', 'Haarlem, Andere regio, Nederland')],
        }),
      )
      .mockResolvedValueOnce(Response.json({ features: [] }))
    vi.stubGlobal('fetch', fetch)
    expect(
      (await lookupPlace('Haarlem', 'pk.fictief', new AbortController().signal)).matched,
    ).toBeNull()
    expect(await lookupPlace('Fictiefdorp', 'pk.fictief', new AbortController().signal)).toEqual({
      candidates: [],
      matched: null,
    })
  })
  it('hergebruikt geen resultaten tussen controles', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() => Promise.resolve(Response.json({ features: [feature()] })))
    vi.stubGlobal('fetch', fetch)
    await lookupPlace('Haarlem', 'pk.fictief', new AbortController().signal)
    await lookupPlace('Haarlem', 'pk.fictief', new AbortController().signal)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it.each([401, 403, 429, 500])(
    'geeft bruikbare feedback bij een API-fout (%i)',
    async (status) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })))
      await expect(
        lookupPlace('Haarlem', 'pk.fictief', new AbortController().signal),
      ).rejects.toThrow(status === 429 ? 'tijdelijk te druk' : 'tijdelijk niet beschikbaar')
    },
  )
  it('geeft afgebroken en mislukte verbindingen door zonder een plaats te bevestigen', async () => {
    const error = new DOMException('Aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))
    await expect(lookupPlace('Haarlem', 'pk.fictief', new AbortController().signal)).rejects.toBe(
      error,
    )
  })
  it('verstuur nooit een geheim token vanuit het veld', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(
      lookupPlace('Haarlem', 'sk.fictief', new AbortController().signal),
    ).rejects.toThrow('nog niet ingesteld')
    expect(fetch).not.toHaveBeenCalled()
  })
})
