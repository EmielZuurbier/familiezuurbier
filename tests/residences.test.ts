import { describe, expect, it } from 'vitest'
import {
  geocodingURL,
  groupResidences,
  mergeMappedResidences,
  mapMarkerOffsets,
  mapLayers,
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
  it('houdt woonplaats en geboorteplaats apart, ook voor dezelfde persoon op dezelfde plaats', () => {
    const people = [{ ...person('1', 'Haarlem'), birthPlace: 'Haarlem' }]
    const residence = groupResidences(people).groups[0]
    const birth = groupResidences(people, 'birth').groups[0]
    expect(residence.key).not.toBe(birth.key)
    expect(residence.lookupKey).toBe(birth.lookupKey)
    const points = mergeMappedResidences(
      [residence, birth].map((group) => ({ group, place: haarlem })),
    )
    expect(points).toHaveLength(2)
    expect(points.map((point) => point.group.layer)).toEqual(['residence', 'birth'])
    expect(new Set(mapLayers.map((layer) => layer.color)).size).toBe(2)
    const offsets = mapMarkerOffsets(points)
    expect(Math.abs(offsets[0][0] - offsets[1][0])).toBeGreaterThan(35)
    expect(points.map((point) => point.place.coordinates)).toEqual([
      haarlem.coordinates,
      haarlem.coordinates,
    ])
    expect(mapMarkerOffsets([points[0]])).toEqual([[0, 0]])
  })
  it('leidt een ontbrekende geboorteplaats niet af uit de huidige woonplaats', () => {
    const people = [person('1', 'Haarlem'), { ...person('2'), birthPlace: '  ' }]
    expect(groupResidences(people, 'birth')).toEqual({ groups: [], missing: people })
    const birthOnly = { ...person('3'), birthPlace: 'Haarlem' }
    expect(groupResidences([birthOnly], 'birth').groups[0].people).toEqual([birthOnly])
  })
  it('houdt een andere plaats centraal en plaatst alleen overlappende lagen uit elkaar', () => {
    const group = groupResidences([person('1', 'Haarlem')]).groups[0]
    const other = groupResidences([{ ...person('2'), birthPlace: 'Haarle' }], 'birth').groups[0]
    const points = mergeMappedResidences([
      { group, place: haarlem },
      { group: other, place: haarle },
    ])
    expect(mapMarkerOffsets(points)).toEqual([
      [0, 0],
      [0, 0],
    ])
  })
})
