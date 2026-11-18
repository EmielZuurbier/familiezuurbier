'use client'
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, MapPin, RotateCw, Search } from 'lucide-react'
import { lookupPlace, placeSearchDelay, searchablePlace } from '@/lib/place-lookup'
import styles from './PlaceInput.module.css'

type SearchResult = Awaited<ReturnType<typeof lookupPlace>> & {
  query: string
  error?: string
  chosen?: boolean
}

// Only the field text enters Payload form state, including a chosen place label.
// Coordinates, result objects and validation remain temporary.
export function PlaceInput({
  id,
  value,
  onChange,
  token,
  readOnly,
  invalid,
  describedBy,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  token: string
  readOnly?: boolean
  invalid?: boolean
  describedBy?: string
}) {
  const [active, setActive] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const input = useRef<HTMLInputElement>(null)
  const query = value.trim()
  const enabled = active && !readOnly && !!token && searchablePlace(query)
  const current = result?.query === query ? result : null
  const chosenQuery = result?.chosen ? result.query : null
  const showSuggestions = open && !readOnly && !!current?.candidates.length
  const choose = (candidate: SearchResult['candidates'][number]) => {
    if (readOnly) return
    onChange(candidate.label)
    setResult({ query: candidate.label, candidates: [candidate], matched: candidate, chosen: true })
    input.current?.focus()
    setOpen(false)
    setActiveIndex(-1)
  }

  useEffect(() => {
    if (!enabled || chosenQuery === query) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const found = await lookupPlace(query, token, controller.signal)
        if (!controller.signal.aborted) setResult({ query, ...found })
      } catch (error) {
        if (!controller.signal.aborted)
          setResult({
            query,
            candidates: [],
            matched: null,
            error:
              error instanceof Error &&
              !(error instanceof TypeError || error instanceof SyntaxError)
                ? error.message
                : 'De plaatscontrole is tijdelijk niet beschikbaar.',
          })
      }
    }, placeSearchDelay)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [enabled, query, token, attempt, chosenQuery])

  const message = !token
    ? 'Plaatscontrole niet beschikbaar. Je kunt de plaats handmatig invullen.'
    : !query
      ? 'Typ plaats en land, bijvoorbeeld Haarlem, Nederland.'
      : query.length < 3
        ? 'Typ minimaal 3 tekens om passende plaatsen te zien.'
        : !searchablePlace(query)
          ? 'Typ minimaal 3 en maximaal 256 tekens, zonder puntkomma (maximaal 20 woorden).'
          : !active
            ? 'Klik in het veld om deze plaats te controleren.'
            : !current
              ? 'Passende plaatsen zoeken…'
              : current.error
                ? current.error
                : current.matched
                  ? 'Plaats gevonden.'
                  : !current.candidates.length
                    ? 'Geen plaats gevonden. Controleer de spelling of voeg regio en land toe. Een historische of onbekende plaats kun je wel bewaren.'
                    : 'Kies de juiste plaats hieronder of typ verder. Controleer ook regio en land.'

  return (
    <div
      className={styles.control}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false)
          setActiveIndex(-1)
        }
      }}
    >
      <div className={styles.inputWrap}>
        <MapPin size={17} className={styles.icon} aria-hidden="true" />
        <input
          ref={input}
          id={id}
          name={id}
          className={styles.input}
          value={value}
          onChange={(event) => {
            setResult(null)
            setActiveIndex(-1)
            setOpen(true)
            onChange(event.target.value)
          }}
          onFocus={() => {
            setActive(true)
            setOpen(true)
          }}
          onKeyDown={(event) => {
            const candidates = current?.candidates ?? []
            if (!readOnly && candidates.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
              event.preventDefault()
              setOpen(true)
              setActiveIndex((index) =>
                event.key === 'ArrowDown'
                  ? (index + 1) % candidates.length
                  : index <= 0
                    ? candidates.length - 1
                    : index - 1,
              )
            } else if (event.key === 'Enter' && showSuggestions && activeIndex >= 0) {
              event.preventDefault()
              choose(candidates[activeIndex])
            } else if (event.key === 'Escape' && open) {
              event.preventDefault()
              event.stopPropagation()
              setOpen(false)
              setActiveIndex(-1)
            }
          }}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls={showSuggestions ? `${id}-suggestions` : undefined}
          aria-activedescendant={
            showSuggestions && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
          }
          autoComplete="off"
          spellCheck={false}
          readOnly={readOnly}
          aria-invalid={invalid || undefined}
          aria-describedby={[describedBy, `${id}-feedback`].filter(Boolean).join(' ')}
          placeholder="Plaats, land…"
        />
      </div>
      <div id={`${id}-feedback`} className={styles.feedback}>
        <p
          className={current?.matched ? styles.matched : styles.message}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {current?.matched ? (
            <CheckCircle2 size={15} aria-hidden="true" />
          ) : (
            <Search size={15} aria-hidden="true" />
          )}
          {message}
        </p>
        {showSuggestions && current && (
          <div className={styles.suggestions}>
            <span className={styles.heading}>Passende plaatsen</span>
            <ul id={`${id}-suggestions`} role="listbox" aria-label="Gevonden plaatsen">
              {current.candidates.map((candidate, index) => (
                <li key={candidate.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    tabIndex={-1}
                    id={`${id}-option-${index}`}
                    aria-selected={activeIndex === index}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(candidate)}
                  >
                    <MapPin size={15} aria-hidden="true" />
                    <span>{candidate.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className={styles.hint}>
              Klik op een plaats om deze over te nemen, of kies met de pijltjestoetsen en Enter.
            </p>
            <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noreferrer">
              © Mapbox
            </a>
          </div>
        )}
      </div>
      {!!current?.error && enabled && (
        <button
          type="button"
          className={styles.retry}
          onClick={() => {
            setResult(null)
            setAttempt((n) => n + 1)
          }}
        >
          <RotateCw size={14} aria-hidden="true" />
          Opnieuw controleren
        </button>
      )}
    </div>
  )
}
