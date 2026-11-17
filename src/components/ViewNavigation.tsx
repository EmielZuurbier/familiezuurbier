import Link from 'next/link'
import { CalendarDays, GitBranch, MapPin } from 'lucide-react'

export function ViewNavigation({
  active,
  treeHref,
  mapHref,
}: {
  active: 'tree' | 'map' | 'calendar'
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
    </nav>
  )
}
