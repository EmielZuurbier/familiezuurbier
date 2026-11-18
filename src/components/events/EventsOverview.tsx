'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  MapPin,
  Search,
  Settings2,
  Users,
  X,
} from 'lucide-react'
import type { Family } from '@/lib/types'
import { eventOrder } from '@/lib/events/timeline'
import { formatDate } from '@/lib/dates'
import { FamilyBrand } from '../FamilyBrand'
import { familyBrand } from '@/lib/branding'
import { FamilyAccountControls, type FamilyViewer } from '../FamilyAccountControls'
import { WorkspaceHeader } from '../WorkspaceHeader'
import { PersonDetail } from '../FamilyTree'
import { PersonAvatar } from '../PersonAvatar'
import { StoryContent } from './StoryContent'

export function EventsOverview({
  family,
  demo,
  treeHref,
  viewer,
  initialEvent,
}: {
  family: Family
  demo: boolean
  treeHref: string
  viewer?: FamilyViewer
  initialEvent?: string
}) {
  const scroll = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('all')
  const [personFilter, setPersonFilter] = useState('all')
  const [selectedEvent, setSelectedEvent] = useState<string | null>(initialEvent ?? null)
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const events = useMemo(() => [...(family.events ?? [])].sort(eventOrder), [family.events])
  const years = [
    ...new Set(events.flatMap((event) => (event.date.year ? [event.date.year] : []))),
  ].sort((a, b) => b - a)
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('nl')
  const filtered = events.filter(
    (event) =>
      (year === 'all' ||
        (year === 'unknown' ? !event.date.year : event.date.year === Number(year))) &&
      (personFilter === 'all' || event.people.includes(personFilter)) &&
      normalize(
        [
          event.title,
          event.place,
          event.excerpt,
          ...event.people.map((id) => family.people.find((person) => person.id === id)?.name ?? ''),
        ].join(' '),
      ).includes(normalize(query.trim())),
  )
  const event = events.find((event) => event.id === selectedEvent)
  const person = family.people.find((person) => person.id === selectedPerson)
  const selectEvent = (id: string | null) => {
    setSelectedEvent(id)
    setSelectedPerson(null)
    scroll.current?.scrollTo({ top: 0 })
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('event', id)
    else url.searchParams.delete('event')
    window.history.pushState({}, '', url)
  }
  useEffect(() => {
    const onPop = () => {
      setSelectedEvent(new URL(window.location.href).searchParams.get('event'))
      setSelectedPerson(null)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedPerson(null)
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('keydown', escape)
    }
  }, [])
  const base = treeHref === '/' ? '' : treeHref
  return (
    <main className="app-shell events-shell">
      <aside className="sidebar events-sidebar">
        <FamilyBrand href={treeHref} />
        <div className="sidebar-heading">
          <span className="eyebrow">VERHALEN DIE ONS VERBINDEN</span>
          <h1>
            {demo ? 'Onze gedeelde' : 'Familie'}
            <br />
            <em>{demo ? 'herinneringen.' : `${familyBrand.surname}.`}</em>
          </h1>
          <p>Grote momenten en kleine verhalen. Bewaard voor de volgende generatie.</p>
        </div>
        <div className="search-area">
          <label htmlFor="events-search">Zoek in de familiegeschiedenis</label>
          <div className="search-field">
            <Search size={17} />
            <input
              id="events-search"
              value={query}
              placeholder="Verhaal, plaats of persoon…"
              onChange={(e) => {
                setQuery(e.target.value)
                if (selectedEvent) selectEvent(null)
              }}
            />
            {query && (
              <button aria-label="Zoekopdracht wissen" onClick={() => setQuery('')}>
                <X size={15} />
              </button>
            )}
          </div>
        </div>
        <div className="events-sidebar-note">
          <BookOpen size={23} />
          <p>
            Een verhaal wordt één keer vastgelegd en komt bij alle betrokken familieleden terug.
          </p>
        </div>
        <div className="sidebar-bottom">
          {viewer !== 'family' && (
            <Link className="admin-link" href="/admin/collections/events">
              <Settings2 size={16} />
              Gebeurtenissen beheren
            </Link>
          )}
          <FamilyAccountControls viewer={viewer} />
        </div>
      </aside>
      <section className="workspace" aria-label="Gebeurtenissen">
        <WorkspaceHeader
          title="Gebeurtenissen"
          active="events"
          treeHref={treeHref}
          mapHref={`${base}/kaart`}
        />
        {demo && (
          <div className="demo-banner">
            <BookOpen size={15} />
            <p>Fictieve verhalen, personen en illustraties als voorbeeld.</p>
          </div>
        )}
        <div className={`events-stage ${person ? 'has-detail' : ''}`}>
          <div className="events-scroll" ref={scroll}>
            {event ? (
              <article className="event-article" aria-label={event.title}>
                <button className="event-back" onClick={() => selectEvent(null)}>
                  <ArrowLeft size={16} />
                  Alle gebeurtenissen
                </button>
                <header>
                  <span className="eyebrow">EEN VERHAAL UIT ONZE FAMILIE</span>
                  <h1>{event.title}</h1>
                  <div className="event-meta">
                    <span>
                      <CalendarDays size={15} />
                      {formatDate(event.date)}
                    </span>
                    {event.place && (
                      <span>
                        <MapPin size={15} />
                        {event.place}
                      </span>
                    )}
                  </div>
                </header>
                {event.cover && (
                  <Image
                    unoptimized
                    className="event-cover"
                    src={event.cover.url}
                    alt={event.cover.alt || ''}
                    width={event.cover.width || 1200}
                    height={event.cover.height || 700}
                  />
                )}
                <StoryContent event={event} />
                {!!event.people.length && (
                  <section className="event-people" aria-label="Betrokken personen">
                    <h2>
                      <Users size={18} />
                      Betrokken personen
                    </h2>
                    <div>
                      {event.people.map((id) => {
                        const p = family.people.find((person) => person.id === id)
                        return p ? (
                          <button key={id} onClick={() => setSelectedPerson(id)}>
                            <PersonAvatar person={p} className="mini-avatar" />
                            <span>{p.name}</span>
                          </button>
                        ) : null
                      })}
                    </div>
                  </section>
                )}
                {viewer === 'administrator' && (
                  <Link
                    className="event-edit"
                    href={`/admin/collections/events/${encodeURIComponent(event.id)}`}
                  >
                    Gebeurtenis bewerken →
                  </Link>
                )}
              </article>
            ) : (
              <>
                {selectedEvent && (
                  <p className="events-not-found" role="status">
                    Deze gebeurtenis is niet beschikbaar. Hieronder staan de andere verhalen.
                  </p>
                )}
                <div className="events-toolbar">
                  <label>
                    Jaar
                    <select
                      aria-label="Jaar"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                    >
                      <option value="all">Alle jaren</option>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                      <option value="unknown">Zonder jaartal</option>
                    </select>
                  </label>
                  <label>
                    Betrokken persoon
                    <select
                      aria-label="Betrokken persoon"
                      value={personFilter}
                      onChange={(e) => setPersonFilter(e.target.value)}
                    >
                      <option value="all">Iedereen</option>
                      {family.people
                        .filter((person) =>
                          events.some((event) => event.people.includes(person.id)),
                        )
                        .toSorted((a, b) => a.name.localeCompare(b.name, 'nl'))
                        .map((person) => (
                          <option value={person.id} key={person.id}>
                            {person.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  {(year !== 'all' || personFilter !== 'all' || query) && (
                    <button
                      onClick={() => {
                        setYear('all')
                        setPersonFilter('all')
                        setQuery('')
                      }}
                    >
                      Filters wissen
                    </button>
                  )}
                  <span role="status">
                    {filtered.length} {filtered.length === 1 ? 'verhaal' : 'verhalen'}
                  </span>
                </div>
                <div className="event-timeline">
                  {filtered.map((event, index) => (
                    <section className="event-timeline-item" key={event.id}>
                      {(index === 0 || event.date.year !== filtered[index - 1].date.year) && (
                        <h2 className="event-year">{event.date.year || 'Zonder jaartal'}</h2>
                      )}
                      <button
                        className="event-card"
                        onClick={() => selectEvent(event.id)}
                        aria-label={`Lees ${event.title}`}
                      >
                        {event.cover && (
                          <Image
                            unoptimized
                            src={event.cover.url}
                            alt=""
                            className="event-card-photo"
                            width={500}
                            height={300}
                          />
                        )}
                        <span className="event-card-content">
                          <span className="event-meta">
                            <CalendarDays size={14} />
                            {formatDate(event.date)}
                          </span>
                          <strong>{event.title}</strong>
                          {event.place && (
                            <span className="event-card-place">
                              <MapPin size={13} />
                              {event.place}
                            </span>
                          )}
                          <span className="event-excerpt">
                            {event.excerpt.slice(0, 170)}
                            {event.excerpt.length > 170 ? '…' : ''}
                          </span>
                          <span className="event-card-bottom">
                            <span className="event-avatar-stack">
                              {event.people.slice(0, 4).map((id) => {
                                const p = family.people.find((p) => p.id === id)
                                return p ? (
                                  <PersonAvatar key={id} person={p} className="mini-avatar" />
                                ) : null
                              })}
                              {event.people.length > 4 && <small>+{event.people.length - 4}</small>}
                            </span>
                            <span>Lees het verhaal →</span>
                          </span>
                        </span>
                      </button>
                    </section>
                  ))}
                </div>
                {!filtered.length && (
                  <div className="events-empty">
                    <BookOpen size={38} />
                    <h3>
                      {events.length ? 'Geen verhalen gevonden' : 'Een plek voor onze verhalen'}
                    </h3>
                    <p>
                      {events.length
                        ? 'Probeer een andere zoekopdracht of wis de filters.'
                        : 'Leg de eerste gebeurtenis vast en koppel de familieleden die erbij horen.'}
                    </p>
                    {viewer === 'administrator' && !events.length && (
                      <Link href="/admin/collections/events/create">
                        Eerste gebeurtenis vastleggen →
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          {person && (
            <PersonDetail
              key={person.id}
              person={person}
              family={family}
              demo={demo}
              onEventSelect={selectEvent}
              eventsBase={treeHref}
              onSelect={setSelectedPerson}
              onClose={() => setSelectedPerson(null)}
            />
          )}
        </div>
        <footer className="workspace-footer">
          <span>
            {events.length} bewaarde {events.length === 1 ? 'gebeurtenis' : 'gebeurtenissen'}
          </span>
          <span className="desktop-only">Een familiegeschiedenis om samen te bewaren</span>
        </footer>
      </section>
    </main>
  )
}
