'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Map as MapboxMap, Marker } from 'mapbox-gl'
import { Maximize, RotateCw } from 'lucide-react'
import 'mapbox-gl/dist/mapbox-gl.css'
import { mapLayers, mapMarkerOffsets, type MappedResidence } from '@/lib/residences'

export type MapPoint = MappedResidence

export function MapCanvas({
  token,
  points,
  focused,
  focusRequest,
  hasDetail,
  settled,
  viewKey,
  onSelect,
  onReady,
}: {
  token: string
  points: MapPoint[]
  focused: string | null
  focusRequest: number
  hasDetail: boolean
  settled: boolean
  viewKey: string
  onSelect: (key: string) => void
  onReady: () => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapboxMap | null>(null)
  const markers = useRef<Marker[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const fitted = useRef<string | null>(null)

  useEffect(() => {
    let disposed = false
    fitted.current = null
    let observer: ResizeObserver | undefined
    void import('mapbox-gl')
      .then(({ default: mapboxgl }) => {
        if (disposed || !container.current) return
        setReady(false)
        setError('')
        if (!mapboxgl.supported()) {
          setError(
            'De kaart kan in deze browser niet worden getoond. Probeer een andere browser; de personenlijst blijft beschikbaar.',
          )
          return
        }
        const instance = new mapboxgl.Map({
          container: container.current,
          accessToken: token,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [5.2, 52.1],
          zoom: 6,
          language: 'nl',
          renderWorldCopies: false,
          locale: {
            'Map.Title': 'Kaart met woonplaatsen en geboorteplaatsen',
            'NavigationControl.ZoomIn': 'Inzoomen',
            'NavigationControl.ZoomOut': 'Uitzoomen',
            'AttributionControl.ToggleAttribution': 'Kaartbronnen tonen',
          },
        })
        map.current = instance
        instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
        instance.on('error', () => {
          if (!disposed)
            setError(
              'De kaart kon niet volledig worden geladen. Controleer je verbinding of probeer opnieuw.',
            )
        })
        instance.on('load', () => {
          if (disposed) return
          setError('')
          setReady(true)
          onReady()
        })
        observer = new ResizeObserver(() => instance.resize())
        observer.observe(container.current)
      })
      .catch(() => {
        if (!disposed) setError('De kaart kon niet worden gestart. Probeer opnieuw.')
      })
    return () => {
      disposed = true
      observer?.disconnect()
      markers.current.forEach((marker) => marker.remove())
      markers.current = []
      map.current?.remove()
      map.current = null
    }
  }, [token, attempt, onReady])

  useEffect(() => {
    if (!ready || !map.current) return
    let disposed = false
    void import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (disposed || !map.current) return
      markers.current.forEach((marker) => marker.remove())
      const offsets = mapMarkerOffsets(points)
      markers.current = points.map(({ group, place }, index) => {
        const button = document.createElement('button')
        button.className = 'residence-marker'
        button.type = 'button'
        button.dataset.layer = group.layer
        const layer = mapLayers.find((layer) => layer.id === group.layer)!
        button.title = `${layer.label}: ${group.label}`
        button.style.backgroundColor = layer.id === 'residence' ? 'var(--green)' : layer.color
        button.textContent = String(group.people.length)
        button.setAttribute(
          'aria-label',
          `${group.people.length} ${group.people.length === 1 ? 'persoon' : 'personen'} · ${layer.label}: ${group.label}`,
        )
        button.setAttribute('data-place-key', group.key)
        button.addEventListener('click', () => onSelect(group.key))
        const marker = new mapboxgl.Marker({ element: button, offset: offsets[index] })
          .setLngLat(place.coordinates)
          .addTo(map.current!)
        // Mapbox labels custom markers as images by default; these are controls.
        button.setAttribute('role', 'button')
        return marker
      })
    })
    return () => {
      disposed = true
    }
  }, [points, ready, onSelect])

  const fitAll = useCallback(() => {
    if (!map.current || !points.length) return
    const lngs = points.map((p) => p.place.coordinates[0]),
      lats = points.map((p) => p.place.coordinates[1])
    map.current.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        padding: 75,
        maxZoom: 10,
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600,
      },
    )
  }, [points])
  useEffect(() => {
    if (!ready || !settled || fitted.current === viewKey) return
    fitted.current = viewKey
    if (!focused) fitAll()
  }, [ready, settled, points, fitAll, focused, viewKey])
  useEffect(() => {
    const place = points.find((p) => focused && p.keys.includes(focused))?.place
    if (ready && place)
      map.current?.flyTo({
        center: place.coordinates,
        zoom: Math.max(9, map.current.getZoom()),
        padding: {
          top: 40,
          left: 30,
          right: 30,
          bottom:
            hasDetail && window.matchMedia('(max-width:760px)').matches
              ? map.current.getContainer().clientHeight * 0.55 + 20
              : 40,
        },
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600,
      })
  }, [focused, focusRequest, hasDetail, points, ready])

  return (
    <div className="family-map-area" aria-label="Kaart met woonplaatsen en geboorteplaatsen">
      <div ref={container} className="family-map-canvas" data-testid="family-map" />
      {!ready && !error && (
        <div className="map-notice" role="status">
          De kaart wordt geladen…
        </div>
      )}
      {error && (
        <div className="map-notice" role="alert">
          <p>{error}</p>
          <button
            onClick={() => {
              setReady(false)
              setError('')
              setAttempt((n) => n + 1)
            }}
          >
            <RotateCw size={14} />
            Opnieuw proberen
          </button>
        </div>
      )}
      {ready && (
        <button className="map-fit-button" onClick={fitAll} disabled={!points.length}>
          <Maximize size={15} />
          Alles in beeld
        </button>
      )}
    </div>
  )
}
