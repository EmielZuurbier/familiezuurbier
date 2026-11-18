'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Settings2,
  X,
} from 'lucide-react'
import type { Family, Person } from '@/lib/types'
import { birthdayCalendar, birthdayMonths, type CalendarDay } from '@/lib/birthdays'
import { formatDate } from '@/lib/dates'
import { birthdayIcs } from '@/lib/birthday-ics'
import { WorkspaceHeader } from './WorkspaceHeader'
import { FamilyAccountControls, type FamilyViewer } from './FamilyAccountControls'
import { LifeStatusIcon } from './LifeStatusIcon'
import { PersonAvatar } from './PersonAvatar'
import { PersonDetail } from './FamilyTree'
import { FamilyBrand } from './FamilyBrand'
import { familyBrand } from '@/lib/branding'

export function BirthdayCalendar({
  family,
  today,
  demo,
  treeHref,
  mapHref,
  viewer,
}: {
  family: Family
  today: CalendarDay
  demo: boolean
  treeHref: string
  mapHref: string
  viewer?: FamilyViewer
}) {
  const [year, setYear] = useState(today.year),
    [month, setMonth] = useState<number | null>(null)
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState('all'),
    [selected, setSelected] = useState<string | null>(null)
  const [exportMessage, setExportMessage] = useState('')
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('nl')
  const filtered = useMemo(
    () =>
      family.people.filter(
        (person) =>
          (status === 'all' || person.lifeStatus === status) &&
          normalize(`${person.name} ${person.birthSurname ?? ''}`).includes(
            normalize(query.trim()),
          ),
      ),
    [family.people, query, status],
  )
  const calendar = useMemo(() => birthdayCalendar(filtered, year, today), [filtered, year, today])
  const exportCount = calendar.months
    .filter((group) => month === null || group.month === month)
    .reduce((sum, group) => sum + group.birthdays.length, 0)
  const downloadBirthdays = () => {
    let url: string | undefined
    try {
      const namespace = `${process.env.NEXT_PUBLIC_SERVER_URL || window.location.origin}${treeHref}`
      const result = birthdayIcs(filtered, {
        month,
        namespace,
        calendarName: demo
          ? 'Voorbeeldverjaardagen (fictief)'
          : `Verjaardagen · ${familyBrand.name}`,
      })
      if (!result.count) return
      url = URL.createObjectURL(new Blob([result.content], { type: 'text/calendar;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `${demo ? 'voorbeeld-' : ''}familieverjaardagen${month ? `-${String(month).padStart(2, '0')}` : ''}.ics`
      document.body.append(link)
      link.click()
      link.remove()
      setExportMessage(
        `${result.count} ${result.count === 1 ? 'verjaardag' : 'verjaardagen'} geëxporteerd.`,
      )
      // Give the browser time to take ownership of the download before releasing its URL.
      const downloadUrl = url
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
    } catch {
      if (url) URL.revokeObjectURL(url)
      setExportMessage('Downloaden is niet gelukt. Probeer het nogmaals.')
    }
  }
  const person = family.people.find((p) => p.id === selected)
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])
  const selectPerson = (id: string) => setSelected((value) => (value === id ? null : id))
  const chooseYear = (value: number) => {
    if (Number.isInteger(value) && value >= 1 && value <= 9999) setYear(value)
  }
  const summary = `${calendar.completeCount} verjaardagen bekend · ${calendar.incomplete.length} geboortedatums onvolledig`
  const entryName = (p: Person) => (
    <span className="birthday-person-name">
      <PersonAvatar person={p} className="mini-avatar" />
      {p.name}
      {p.lifeStatus === 'deceased' && <LifeStatusIcon status="deceased" />}
    </span>
  )
  return (
    <main className="app-shell birthday-shell">
      <aside className="sidebar birthday-sidebar">
        <FamilyBrand href={treeHref} />
        <div className="sidebar-heading">
          <span className="eyebrow">ELKE VERJAARDAG EEN VERHAAL</span>
          <h1>
            {demo ? 'Een jaar vol' : 'Familie'}
            <br />
            <em>{demo ? 'familie.' : `${familyBrand.surname}.`}</em>
          </h1>
          <p>Alle geboortedagen bij elkaar. Kijk wie er jarig is en hoe oud iemand wordt.</p>
        </div>
        <div className="search-area">
          <label htmlFor="birthday-search">Wie zoek je?</label>
          <div className="search-field">
            <Search size={17} />
            <input
              id="birthday-search"
              placeholder="Zoek een naam…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="Zoekopdracht wissen" onClick={() => setQuery('')}>
                <X size={15} />
              </button>
            )}
          </div>
        </div>
        <div className="birthday-month-navigation" aria-label="Maanden">
          <button aria-pressed={month === null} onClick={() => setMonth(null)}>
            Het hele jaar
          </button>
          <div>
            {birthdayMonths.map((label, i) => (
              <button key={label} aria-pressed={month === i + 1} onClick={() => setMonth(i + 1)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="sidebar-bottom">
          {viewer !== 'family' && (
            <Link className="admin-link" href="/admin">
              <Settings2 size={16} />
              Persoonsgegevens beheren
            </Link>
          )}
          <FamilyAccountControls viewer={viewer} />
        </div>
      </aside>
      <section className="workspace" aria-label="Verjaardagskalender">
        <WorkspaceHeader
          title="Verjaardagen"
          active="calendar"
          treeHref={treeHref}
          mapHref={mapHref}
        />
        {demo && (
          <div className="demo-banner">
            <CalendarDays size={15} />
            <p>Fictieve personen met verzonnen geboortedatums.</p>
          </div>
        )}
        <div className="birthday-toolbar">
          <div className="birthday-year">
            <button
              aria-label="Vorig kalenderjaar"
              onClick={() => chooseYear(year - 1)}
              disabled={year === 1}
            >
              <ChevronLeft size={17} />
            </button>
            <label>
              <span>Kalenderjaar</span>
              <input
                type="number"
                aria-label="Kalenderjaar"
                min={1}
                max={9999}
                value={year}
                onChange={(e) => chooseYear(Number(e.target.value))}
              />
            </label>
            <button
              aria-label="Volgend kalenderjaar"
              onClick={() => chooseYear(year + 1)}
              disabled={year === 9999}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <label className="birthday-month-select">
            Maand
            <select
              aria-label="Maand"
              value={month ?? ''}
              onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Het hele jaar</option>
              {birthdayMonths.map((name, i) => (
                <option value={i + 1} key={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Toon
            <select
              aria-label="Familieleden filteren"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Alle familieleden</option>
              <option value="living">In leven</option>
              <option value="deceased">Overleden</option>
              <option value="unknown">Levensstatus onbekend</option>
            </select>
          </label>
          {(year !== today.year || month !== null) && (
            <button
              className="birthday-reset"
              onClick={() => {
                setYear(today.year)
                setMonth(null)
              }}
            >
              Dit jaar
            </button>
          )}
          <div className="birthday-export">
            <button
              onClick={downloadBirthdays}
              disabled={!exportCount}
              aria-describedby="birthday-export-note"
            >
              <Download size={15} /> Download .ics <span>({exportCount})</span>
            </button>
            <span id="birthday-export-note">Huidige selectie · jaarlijks herhaald</span>
          </div>
        </div>
        <div className={`tree-stage birthday-stage ${person ? 'has-detail' : ''}`}>
          <div className="birthday-scroll">
            <p className="birthday-summary" role="status">
              {summary}
            </p>
            {exportMessage && (
              <p className="birthday-export-message" role="status">
                {exportMessage}
              </p>
            )}
            {!!filtered.length && (
              <div className="birthday-grid">
                {calendar.months
                  .filter((group) => month === null || month === group.month)
                  .map((group) => (
                    <section
                      className={`birthday-month ${year === today.year && group.month === today.month ? 'is-current-month' : ''}`}
                      key={group.month}
                      aria-label={group.label}
                    >
                      <header>
                        <h3>{group.label}</h3>
                        <span>{group.birthdays.length}</span>
                      </header>
                      {group.birthdays.length ? (
                        <ul>
                          {group.birthdays.map((entry) => (
                            <li key={entry.person.id}>
                              <button
                                className={`birthday-entry ${entry.today ? 'is-today' : ''}`}
                                aria-label={`Bekijk ${entry.person.name}, ${entry.birthLabel}, ${entry.ageLabel}`}
                                aria-pressed={selected === entry.person.id}
                                onClick={() => selectPerson(entry.person.id)}
                              >
                                <span className="birthday-day">
                                  {String(entry.day).padStart(2, '0')}
                                </span>
                                <span className="birthday-info">
                                  {entryName(entry.person)}
                                  <span className="birthday-birthdate">{entry.birthLabel}</span>
                                  <span className="birthday-age">
                                    {entry.ageLabel}
                                    {entry.leapDay ? ' · Schrikkeldag' : ''}
                                  </span>
                                  {entry.today && (
                                    <span className="birthday-today">
                                      {entry.person.lifeStatus === 'deceased'
                                        ? 'Vandaag geboortedag'
                                        : 'Vandaag jarig'}
                                    </span>
                                  )}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="birthday-none">Geen verjaardagen bekend.</p>
                      )}
                    </section>
                  ))}
              </div>
            )}
            {!!calendar.incomplete.length && (
              <section className="birthday-incomplete">
                <h3>
                  Geboortedatum nog onvolledig <span>{calendar.incomplete.length}</span>
                </h3>
                <p>
                  Deze geboortedatums zijn nog onvolledig of moeten worden gecontroleerd. Deze
                  personen staan daarom nog niet op een dag in de kalender.
                </p>
                <div>
                  {calendar.incomplete.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectPerson(p.id)}
                      aria-pressed={selected === p.id}
                      aria-label={`Bekijk ${p.name}`}
                    >
                      {entryName(p)}
                      <span>{formatDate(p.birth)}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {!filtered.length && <p className="birthday-no-results">Geen familieleden gevonden.</p>}
          </div>
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
        <footer className="workspace-footer birthday-footer">
          <span>Leeftijden gelden voor {year} · Nederlandse kalenderdag</span>
          <span>Alleen bij overleden personen: “zou worden”</span>
        </footer>
      </section>
    </main>
  )
}
