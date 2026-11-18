import Link from 'next/link'
import { CalendarDays, GitBranch, MapPin, BookOpen } from 'lucide-react'

export function ViewNavigation({
  active,
  treeHref,
  mapHref,
}: {
  active: 'tree' | 'map' | 'calendar' | 'events'
  treeHref: string
  mapHref: string
}) {
  return (
    <nav className="view-navigation" aria-label="Weergave">
      <Link href={treeHref} aria-current={active === 'tree' ? 'page' : undefined}>
        <GitBranch size={15} />
        Stamboom
      </Link>
      <Link href={mapHref} aria-current={active === 'map' ? 'page' : undefined}>
        <MapPin size={15} />
        Kaart
      </Link>
      <Link
        href={treeHref === '/' ? '/verjaardagen' : `${treeHref}/verjaardagen`}
        aria-current={active === 'calendar' ? 'page' : undefined}
        aria-label="Verjaardagskalender"
      >
        <CalendarDays size={15} />
        <span className="calendar-full-label">Verjaardagskalender</span>
        <span className="calendar-short-label" aria-hidden="true">
          Verjaardagen
        </span>
      </Link>
      <Link
        href={treeHref === '/' ? '/gebeurtenissen' : `${treeHref}/gebeurtenissen`}
        aria-current={active === 'events' ? 'page' : undefined}
        aria-label="Gebeurtenissen"
      >
        <BookOpen size={15} />
        <span className="events-full-label">Gebeurtenissen</span>
        <span className="events-short-label" aria-hidden="true">
          Verhalen
        </span>
      </Link>
    </nav>
  )
}
