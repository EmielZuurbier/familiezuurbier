import { geocodingURL, placeCandidates, preferredCandidate } from './residences'

export const placeSearchDelay = 400
export function searchablePlace(value: string): boolean {
  return (
    value.trim().length >= 3 &&
    value.trim().length <= 256 &&
    !value.includes(';') &&
    value.trim().split(/\s+/).length <= 20
  )
}

export async function lookupPlace(query: string, token: string, signal: AbortSignal) {
  if (!searchablePlace(query))
    throw new Error('Vul een plaatsnaam van 3 tot 256 tekens in, zonder puntkomma.')
  if (!token.startsWith('pk.')) throw new Error('De plaatscontrole is nog niet ingesteld.')
  const response = await fetch(geocodingURL(query.trim(), token, true), {
    signal,
    cache: 'no-store',
    credentials: 'omit',
    // Keep URL-restricted public tokens usable without exposing the CMS path.
    referrerPolicy: 'origin',
  })
  if (!response.ok) {
    if (response.status === 429)
      throw new Error('De plaatscontrole is tijdelijk te druk. Probeer het straks opnieuw.')
    throw new Error(
      'De plaatscontrole is tijdelijk niet beschikbaar. Je kunt je invoer wel bewaren.',
    )
  }
  const candidates = placeCandidates(await response.json())
  return { candidates, matched: preferredCandidate(query, candidates) }
}
