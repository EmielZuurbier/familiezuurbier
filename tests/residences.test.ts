import { describe, expect, it } from 'vitest'
import {
  geocodingURL,
  groupResidences,
  mergeMappedResidences,
  placeCandidates,
  preferredCandidate,
  type PlaceCandidate,
} from '../src/lib/residences'
import type { Person } from '../src/lib/types'

const person = (id: string, currentResidence?: string | null): Person => ({
  id,
  name: `Fictief ${id}`,
  currentResidence,
  birth: {},
  death: {},
  lifeStatus: 'unknown',
})
const haarlem: PlaceCandidate = {
  id: 'city-haarlem',
  name: 'Haarlem',
  label: 'Haarlem, Noord-Holland, Nederland',
  coordinates: [4.64, 52.38],
}
const haarle: PlaceCandidate = {
  id: 'city-haarle',
  name: 'Haarle',
  label: 'Haarle, Overijssel, Nederland',
  coordinates: [6.38, 52.36],
}
const feature = (properties = {}, coordinates: unknown = [4.64, 52.38]) => ({
  geometry: { type: 'Point', coordinates },
  properties: {
    feature_type: 'place',
    mapbox_id: 'city-haarlem',
    full_address: haarlem.label,
    name: 'Haarlem',
    ...properties,
  },
})

describe('Woonplaatsen op de familiekaart', () => {
  it('groepeert dezelfde invoer zonder rekening te houden met hoofdletters, accenten of extra spaties', () => {
    const result = groupResidences([person('1', ' Gent, België '), person('2', 'GENT,  BELGIE')])
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].people.map((p) => p.id)).toEqual(['1', '2'])
  })
  it('behoudt personen zonder woonplaats en leidt die niet af uit hun geboorteplaats', () => {
    const people = [person('1'), person('2', null), { ...person('3', '  '), birthPlace: 'Haarlem' }]
    expect(groupResidences(people)).toEqual({ groups: [], missing: people })
  })
  it('accepteert alleen geldige plaatsresultaten en ontdubbelt dezelfde Mapbox-plaats', () => {
    expect(
      placeCandidates({
        features: [
          feature(),
          feature(),
          feature({ feature_type: 'country' }),
          feature({}, [181, 52]),
          feature({}, ['4', 52]),
          feature({}, [4, Infinity]),
          feature({ full_address: null }),
        ],
      }),
    ).toEqual([haarlem])
    expect(placeCandidates(null)).toEqual([])
    expect(placeCandidates({ features: 'invalid' })).toEqual([])
  })
  it('kiest een unieke exacte plaats in de opgegeven context en wijst bijna-overeenkomsten af', () => {
    expect(preferredCandidate('Haarlem, Nederland', [haarle, haarlem])).toEqual(haarlem)
    expect(preferredCandidate('Haarlem, België', [haarlem])).toBeNull()
    expect(preferredCandidate('Haarlem', [haarle])).toBeNull()
  })
  it('vraagt om een keuze als dezelfde plaatsnaam meer dan één keer voorkomt', () => {
    const other = { ...haarlem, id: 'other-haarlem', label: 'Haarlem, Een andere regio, Nederland' }
    expect(preferredCandidate('Haarlem', [haarlem, other])).toBeNull()
    expect(preferredCandidate('Onbekende plaats', [])).toBeNull()
  })
  it('voegt verschillende schrijfwijzen van dezelfde gevonden plaats samen zonder de familiegegevens te wijzigen', () => {
    const { groups } = groupResidences([person('1', 'Haarlem'), person('2', 'Haarlem, Nederland')])
    const merged = mergeMappedResidences(groups.map((group) => ({ group, place: haarlem })))
    expect(merged).toHaveLength(1)
    expect(merged[0].group.people).toHaveLength(2)
    expect(merged[0].keys).toHaveLength(2)
    expect(groups.map((group) => group.people.length)).toEqual([1, 1])
  })
  it('zoekt alleen plaatsnamen op zonder permanente opslag of automatisch aanvullen', () => {
    const url = new URL(geocodingURL('Gent, België', 'pk.fictief'))
    expect(url.origin).toBe('https://api.mapbox.com')
    expect(url.searchParams.get('q')).toBe('Gent, België')
    expect(url.searchParams.get('permanent')).toBe('false')
    expect(url.searchParams.get('autocomplete')).toBe('false')
    expect(url.searchParams.get('types')).toBe('place,locality')
    expect([...url.searchParams.keys()].sort()).toEqual([
      'access_token',
      'autocomplete',
      'language',
      'limit',
      'permanent',
      'q',
      'types',
    ])
  })
})
