import type { Person } from './types'

export type PlaceCandidate = {
  id: string
  name: string
  label: string
  coordinates: [number, number]
}
export const mapLayers = [
  { id: 'residence', label: 'Huidige woonplaats', field: 'currentResidence', color: '#345d49' },
  { id: 'birth', label: 'Geboorteplaats', field: 'birthPlace', color: '#426b96' },
] as const
export type MapLayer = (typeof mapLayers)[number]['id']
export type ResidenceGroup = {
  key: string
  lookupKey: string
  layer: MapLayer
  label: string
  people: Person[]
}
export type MappedResidence = { group: ResidenceGroup; place: PlaceCandidate; keys: string[] }

export function mergeMappedResidences(
  points: { group: ResidenceGroup; place: PlaceCandidate }[],
): MappedResidence[] {
  const merged = new Map<string, MappedResidence>()
  for (const point of points) {
    const mergeKey = `${point.group.layer}:${point.place.id}`
    const current = merged.get(mergeKey)
    if (current) {
      current.keys.push(point.group.key)
      current.group.people.push(...point.group.people)
    } else
      merged.set(mergeKey, {
        ...point,
        keys: [point.group.key],
        group: { ...point.group, people: [...point.group.people] },
      })
  }
  return [...merged.values()]
}

export function normalizePlace(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('nl')
}

export function groupResidences(
  people: Person[],
  layer: MapLayer = 'residence',
): { groups: ResidenceGroup[]; missing: Person[] } {
  const groups = new Map<string, ResidenceGroup>()
  const missing: Person[] = []
  for (const person of people) {
    const field = mapLayers.find((item) => item.id === layer)!.field
    const label = person[field]?.trim()
    if (!label) {
      missing.push(person)
      continue
    }
    const lookupKey = normalizePlace(label)
    const key = `${layer}:${lookupKey}`
    const group = groups.get(key) ?? { key, lookupKey, layer, label, people: [] }
    group.people.push(person)
    groups.set(key, group)
  }
  return {
    groups: [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, 'nl')),
    missing,
  }
}

// Treat service responses as untrusted. Only city/district results with valid
// coordinates are eligible; never fall back to the centre of a country.
export function placeCandidates(response: unknown): PlaceCandidate[] {
  if (
    !response ||
    typeof response !== 'object' ||
    !('features' in response) ||
    !Array.isArray(response.features)
  )
    return []
  const result: PlaceCandidate[] = []
  for (const feature of response.features) {
    const p = feature?.properties
    const coordinates = feature?.geometry?.coordinates
    if (
      !p ||
      !['place', 'locality'].includes(p.feature_type) ||
      feature?.geometry?.type !== 'Point' ||
      !Array.isArray(coordinates)
    )
      continue
    const [lng, lat] = coordinates
    if (
      !Number.isFinite(lng) ||
      !Number.isFinite(lat) ||
      lng < -180 ||
      lng > 180 ||
      lat < -90 ||
      lat > 90
    )
      continue
    if (
      typeof p.full_address !== 'string' ||
      !p.full_address.trim() ||
      typeof p.name !== 'string' ||
      typeof p.mapbox_id !== 'string'
    )
      continue
    if (result.some((c) => c.id === p.mapbox_id)) continue
    result.push({ id: p.mapbox_id, name: p.name, label: p.full_address, coordinates: [lng, lat] })
  }
  return result
}

export function preferredCandidate(
  query: string,
  candidates: PlaceCandidate[],
): PlaceCandidate | null {
  const [name, ...context] = query.split(',').map(normalizePlace).filter(Boolean)
  const exact = candidates.filter(
    (candidate) =>
      normalizePlace(candidate.name) === name &&
      context.every((part) => normalizePlace(candidate.label).includes(part)),
  )
  return exact.length === 1 ? exact[0] : null
}

export function geocodingURL(place: string, token: string, autocomplete = false): string {
  const url = new URL('https://api.mapbox.com/search/geocode/v6/forward')
  url.search = new URLSearchParams({
    q: place,
    access_token: token,
    types: 'place,locality',
    autocomplete: String(autocomplete),
    limit: '5',
    language: 'nl',
    permanent: 'false',
  }).toString()
  return url.toString()
}

// Separate layers at the same coordinates in screen pixels, leaving the real
// geographic position intact. A single visible layer stays exactly centred.
export function mapMarkerOffsets(points: MappedResidence[]): [number, number][] {
  const locations = new Map<string, number[]>()
  points.forEach((point, index) => {
    const key = point.place.coordinates.join(',')
    locations.set(key, [...(locations.get(key) ?? []), index])
  })
  const offsets: [number, number][] = points.map(() => [0, 0])
  for (const indices of locations.values()) {
    indices.sort((a, b) => points[a].group.layer.localeCompare(points[b].group.layer))
    indices.forEach((index, position) => {
      offsets[index] = [(position - (indices.length - 1) / 2) * 42, 0]
    })
  }
  return offsets
}
