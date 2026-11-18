'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { MapPin, Search, Settings2, Users, X, RotateCw } from 'lucide-react'
import { FamilyBrand } from './FamilyBrand'
import { familyBrand } from '@/lib/branding'
import type { Family, Person } from '@/lib/types'
import {
  geocodingURL,
  mapLayers,
  type MapLayer,
  groupResidences,
  normalizePlace,
  placeCandidates,
  preferredCandidate,
  mergeMappedResidences,
  type PlaceCandidate,
} from '@/lib/residences'
import { MapCanvas } from './MapCanvas'
import { WorkspaceHeader } from './WorkspaceHeader'
import { PersonAvatar } from './PersonAvatar'
import { PersonDetail } from './FamilyTree'
import { FamilyAccountControls, type FamilyViewer } from './FamilyAccountControls'

type Lookup = {
  state: 'loading' | 'ready' | 'choose' | 'missing' | 'error'
  candidates: PlaceCandidate[]
  chosen?: PlaceCandidate
}

export function FamilyMap({
  family,
  token,
  demo,
  treeHref,
  mapHref,
  viewer,
}: {
  family: Family
  token: string
  demo: boolean
  treeHref: string
  mapHref: string
  viewer?: FamilyViewer
}) {
  const layerGroups = useMemo(
    () => mapLayers.map((layer) => ({ ...layer, ...groupResidences(family.people, layer.id) })),
    [family.people],
  )
  const allGroups = useMemo(() => layerGroups.flatMap((layer) => layer.groups), [layerGroups])
  const [layers, setLayers] = useState<MapLayer[]>(['residence', 'birth'])
  const activeLayers = layerGroups.filter((layer) => layers.includes(layer.id))
  const groups = useMemo(
    () => allGroups.filter((group) => layers.includes(group.layer)),
    [allGroups, layers],
  )
  const [lookups, setLookups] = useState<Record<string, Lookup>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState(0)
  const [query, setQuery] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [lookupError, setLookupError] = useState('')
  const groupElements = useRef(new Map<string, HTMLElement>())
  const mapReady = useCallback(() => setReady(true), [])

  useEffect(() => {
    if (!ready || !token) return
    const controller = new AbortController()
    // Share geography lookups across layers; place choices remain independent.
    const buckets = new Map<string, typeof allGroups>()
    for (const group of allGroups) {
      buckets.set(group.lookupKey, [...(buckets.get(group.lookupKey) ?? []), group])
    }
    const requests = [...buckets.values()]
    let index = 0,
      denied = false
    async function worker() {
      while (index < requests.length && !controller.signal.aborted) {
        const batch = requests[index++]
        const group = batch[0]
        let lookup: Lookup = { state: 'error', candidates: [] }
        if (!denied)
          try {
            const response = await fetch(geocodingURL(group.label, token), {
              signal: controller.signal,
              cache: 'no-store',
              credentials: 'omit',
            })
            if (!response.ok) {
              if ([401, 403, 429].includes(response.status)) denied = true
              throw new Error('lookup failed')
            }
            const candidates = placeCandidates(await response.json())
            const chosen = preferredCandidate(group.label, candidates)
            lookup = {
              state: chosen ? 'ready' : candidates.length ? 'choose' : 'missing',
              candidates,
              ...(chosen ? { chosen } : {}),
            }
          } catch {
            if (controller.signal.aborted) return
            setLookupError(
              'Niet alle plaatsen konden worden opgezocht. Controleer je verbinding of probeer opnieuw.',
            )
          }
        if (!controller.signal.aborted)
          setLookups((current) => ({
            ...current,
            ...Object.fromEntries(batch.map((item) => [item.key, lookup])),
          }))
      }
    }
    void Promise.all(Array.from({ length: Math.min(3, requests.length) }, worker))
    return () => controller.abort()
  }, [allGroups, token, ready, attempt])

  const points = useMemo(
    () =>
      mergeMappedResidences(
        groups.flatMap((group) => {
          const place = lookups[group.key]?.chosen
          return place ? [{ group, place }] : []
        }),
      ),
    [groups, lookups],
  )
  const loading = groups.some(
    (group) => !lookups[group.key] || lookups[group.key].state === 'loading',
  )
  const plotted = new Set(points.flatMap((point) => point.group.people.map((p) => p.id))).size
  const person = family.people.find((person) => person.id === selected)
  const q = normalizePlace(query)
  const matches = (p: Person) =>
    !q ||
    normalizePlace(
      `${p.name} ${p.birthSurname ?? ''} ${p.currentResidence ?? ''} ${p.birthPlace ?? ''}`,
    ).includes(q)
  const selectPerson = (id: string, groupKey?: string) => {
    const nextGroup =
      groups.find((group) => group.key === groupKey) ??
      groups.find((group) => group.key === focused && group.people.some((p) => p.id === id)) ??
      groups.find((group) => group.people.some((p) => p.id === id))
    setSelected((current) => (current === id && focused === (nextGroup?.key ?? null) ? null : id))
    setFocused(nextGroup?.key ?? null)
    setFocusRequest((n) => n + 1)
    setListOpen(false)
    setQuery('')
  }
  const selectPlace = useCallback(
    (key: string) => {
      setFocused(key)
      setFocusRequest((n) => n + 1)
      setSelected(null)
      setListOpen(true)
    },
    [setFocused, setSelected],
  )
  useEffect(() => {
    if (focused) groupElements.current.get(focused)?.scrollIntoView({ block: 'nearest' })
  }, [focused, listOpen])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected(null)
        setListOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  const personButton = (p: Person, groupKey?: string) => (
    <button
      className="map-person"
      key={p.id}
      aria-pressed={p.id === selected}
      onClick={() => selectPerson(p.id, groupKey)}
    >
      <span className="map-person-identity">
        <PersonAvatar person={p} className="mini-avatar" />
        <span>{p.name}</span>
      </span>
      <span aria-hidden="true">→</span>
    </button>
  )

  return (
    <main className="app-shell map-shell">
      <aside className="sidebar map-sidebar">
        <FamilyBrand href={treeHref} />
        <div className="sidebar-heading map-sidebar-heading">
          <span className="eyebrow">VERBONDEN, WAAR WE OOK ZIJN</span>
          <h1>
            {demo ? 'Onze familie,' : 'Familie'}
            <br />
            <em>{demo ? 'op de kaart.' : `${familyBrand.surname}.`}</em>
          </h1>
          <p>Ontdek waar de familie woont en waar onze verhalen begonnen.</p>
        </div>
        <div className="search-area">
          <label htmlFor="map-person-search">Zoek een persoon of plaats</label>
          <div className="search-field">
            <Search size={17} />
            <input
              id="map-person-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Naam of plaats…"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Zoekopdracht wissen">
                <X size={15} />
              </button>
            )}
          </div>
        </div>
        <button
          className="map-list-toggle"
          onClick={() => setListOpen((open) => !open)}
          aria-expanded={listOpen || !!q}
          aria-controls="map-person-list"
        >
          <Users size={15} />
          Personen ({family.people.length})
        </button>
        <div
          className="map-person-list"
          id="map-person-list"
          data-open={listOpen || !!q}
          aria-label="Personen per kaartlaag"
        >
          <div className="map-list-heading">
            <span className="eyebrow">PLAATSEN</span>
            <button
              className="map-list-close"
              onClick={() => {
                setListOpen(false)
                setQuery('')
              }}
              aria-label="Personenlijst sluiten"
            >
              <X size={16} />
            </button>
          </div>
          {groups
            .filter((group) => group.people.some(matches))
            .map((group) => {
              const lookup = lookups[group.key]
              return (
                <section
                  ref={(element) => {
                    if (element) groupElements.current.set(group.key, element)
                    else groupElements.current.delete(group.key)
                  }}
                  className={`residence-group ${focused === group.key ? 'is-focused' : ''}`}
                  key={group.key}
                >
                  <button
                    className="residence-heading"
                    onClick={() => selectPlace(group.key)}
                    aria-label={`Bekijk ${mapLayers.find((layer) => layer.id === group.layer)!.label.toLowerCase()} ${group.label}`}
                  >
                    <MapPin
                      size={14}
                      color={mapLayers.find((layer) => layer.id === group.layer)!.color}
                    />
                    <strong>{group.label}</strong>
                    <span>{group.people.length}</span>
                  </button>
                  <p className="map-group-layer">
                    {mapLayers.find((layer) => layer.id === group.layer)!.label}
                  </p>
                  <p className="residence-status">
                    {lookup?.state === 'ready'
                      ? lookup.chosen?.label
                      : lookup?.state === 'choose'
                        ? 'Kies de juiste plaats hieronder'
                        : lookup?.state === 'missing'
                          ? 'Plaats niet gevonden; controleer de plaats in het beheer'
                          : lookup?.state === 'error'
                            ? 'Nog niet op de kaart geplaatst'
                            : ready
                              ? 'Plaats opzoeken…'
                              : 'Nog niet op de kaart geplaatst'}
                  </p>
                  {lookup?.state === 'ready' && (
                    <button
                      className="place-change"
                      onClick={() =>
                        setLookups((current) => ({
                          ...current,
                          [group.key]: { state: 'choose', candidates: lookup.candidates },
                        }))
                      }
                    >
                      Andere plaats kiezen
                    </button>
                  )}
                  {lookup?.state === 'choose' && (
                    <label className="place-choice">
                      Welke plaats bedoel je?
                      <select
                        aria-label={`Kies de juiste ${group.layer === 'birth' ? 'geboorteplaats' : 'woonplaats'} voor ${group.label}`}
                        defaultValue=""
                        onChange={(e) => {
                          const chosen = lookup.candidates.find(
                            (candidate) => candidate.id === e.target.value,
                          )
                          if (chosen) {
                            setLookups((current) => ({
                              ...current,
                              [group.key]: { ...lookup, state: 'ready', chosen },
                            }))
                            setFocused(group.key)
                            setSelected(null)
                            setFocusRequest((n) => n + 1)
                          }
                        }}
                      >
                        <option value="" disabled>
                          Kies een plaats…
                        </option>
                        {lookup.candidates.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {group.people.filter(matches).map((p) => personButton(p, group.key))}
                </section>
              )
            })}
          {activeLayers.map((layer) => {
            const missing = layer.missing.filter(matches)
            return missing.length ? (
              <section className="residence-group" key={`missing-${layer.id}`}>
                <h2 className="residence-heading">
                  <Users size={14} />
                  {layer.label} onbekend<span>{missing.length}</span>
                </h2>
                <p className="residence-status">
                  {viewer === 'family'
                    ? `Een beheerder kan de ${layer.label.toLowerCase()} toevoegen.`
                    : `Vul de ${layer.label.toLowerCase()} in bij de persoon in het beheer.`}
                </p>
                {missing.map((p) => personButton(p))}
              </section>
            ) : null
          })}
          {!family.people.some(matches) && (
            <p className="map-empty-list">Geen personen gevonden.</p>
          )}
        </div>
        <div className="map-sidebar-bottom">
          <p>Stippen tonen het centrum van een plaats.</p>
          {viewer !== 'family' && (
            <Link className="admin-link" href="/admin">
              <Settings2 size={16} />
              Persoonsgegevens beheren
            </Link>
          )}
          <FamilyAccountControls viewer={viewer} />
        </div>
      </aside>
      <section className="workspace" aria-label="Familie op de kaart">
        <WorkspaceHeader title="Op de kaart" active="map" treeHref={treeHref} mapHref={mapHref} />
        {demo && (
          <div className="demo-banner">
            <MapPin size={15} />
            <p>Alle personen en plaatskoppelingen in dit voorbeeld zijn fictief.</p>
          </div>
        )}
        <fieldset className="map-layer-filter">
          <legend>Kaartlagen</legend>
          {mapLayers.map((layer) => (
            <label key={layer.id} data-layer={layer.id}>
              <input
                type="checkbox"
                checked={layers.includes(layer.id)}
                onChange={(event) => {
                  const enabled = event.target.checked
                  setLayers((current) =>
                    mapLayers
                      .filter((item) =>
                        item.id === layer.id ? enabled : current.includes(item.id),
                      )
                      .map((item) => item.id),
                  )
                  setFocused(null)
                }}
              />
              <span
                className="map-layer-swatch"
                style={{ backgroundColor: layer.color }}
                aria-hidden="true"
              />
              {layer.label}
            </label>
          ))}
        </fieldset>
        <div className={`tree-stage map-stage ${person ? 'has-detail' : ''}`}>
          {token ? (
            <MapCanvas
              token={token}
              points={points}
              focused={focused}
              focusRequest={focusRequest}
              hasDetail={!!person}
              settled={!loading}
              viewKey={layers.join(',')}
              onSelect={selectPlace}
              onReady={mapReady}
            />
          ) : (
            <div className="map-unconfigured">
              <MapPin size={36} />
              <h3>De kaart is nog niet ingesteld</h3>
              <p>
                Vraag de beheerder om de kaart te activeren. De personenlijst is al beschikbaar.
              </p>
            </div>
          )}
          {(!layers.length || (ready && !groups.length)) && (
            <div className="map-empty-state">
              <h3>{layers.length ? 'Nog geen plaatsen ingevuld' : 'Kies een kaartlaag'}</h3>
              <p>
                {layers.length
                  ? 'Vul bij een persoon een plaats in voor de gekozen kaartlaag. Daarna verschijnt die op deze kaart.'
                  : 'Zet huidige woonplaats, geboorteplaats of beide lagen aan.'}
              </p>
              {!!layers.length &&
                (viewer !== 'family' ? (
                  <Link href="/admin">Plaatsen invullen →</Link>
                ) : (
                  <p>Een beheerder kan de plaatsen toevoegen.</p>
                ))}
            </div>
          )}
          {person && (
            <PersonDetail
              key={person.id}
              person={person}
              family={family}
              demo={demo}
              onSelect={selectPerson}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
        <footer className="workspace-footer map-footer">
          <span role="status">
            {plotted} van {family.people.length} personen op de kaart · {points.length}{' '}
            plaatsmarkeringen
            {token && ready && loading ? ' · Plaatsen opzoeken…' : ''}
          </span>
          {lookupError ? (
            <button
              onClick={() => {
                setLookups({})
                setLookupError('')
                setAttempt((n) => n + 1)
              }}
              title={lookupError}
            >
              <RotateCw size={13} />
              Plaatsen opnieuw opzoeken
            </button>
          ) : (
            <span className="desktop-only">Sleep om te verplaatsen · scroll om te zoomen</span>
          )}
        </footer>
      </section>
    </main>
  )
}
