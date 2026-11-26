'use client'
import Link, { useLinkStatus } from 'next/link'
import {
  CalendarDays,
  GitBranch,
  MapPin,
  BookOpen,
  LoaderCircle,
  type LucideIcon,
} from 'lucide-react'
import { useSiteSettings } from './SiteSettingsProvider'
import { moduleKeys, siteText } from '@/lib/site-settings'

function NavigationLabel({
  icon: Icon,
  label,
  shortLabel,
}: {
  icon: LucideIcon
  label: string
  shortLabel: string
}) {
  const { pending } = useLinkStatus()
  return (
    <span
      className={`view-link-content${pending ? ' is-pending' : ''}`}
      aria-busy={pending || undefined}
    >
      <span className="view-link-icon" aria-hidden="true">
        <Icon size={15} />
        <LoaderCircle size={15} className="view-link-spinner" />
      </span>
      <span className="view-full-label">{label}</span>
      <span className="view-short-label" aria-hidden="true">
        {shortLabel}
      </span>
      <span className="sr-only" role="status">
        {pending ? `${label} laden…` : ''}
      </span>
    </span>
  )
}

export function ViewNavigation({
  active,
  treeHref,
  mapHref,
}: {
  active: 'tree' | 'map' | 'calendar' | 'events'
  treeHref: string
  mapHref: string
}) {
  const settings = useSiteSettings()
  const base = treeHref === '/' ? '' : treeHref
  const links = {
    tree: treeHref,
    map: mapHref,
    calendar: `${base}/verjaardagen`,
    events: `${base}/gebeurtenissen`,
  }
  const icons = { tree: GitBranch, map: MapPin, calendar: CalendarDays, events: BookOpen }
  return (
    <nav className="view-navigation" aria-label="Weergave">
      {moduleKeys
        .filter((key) => settings.pages[key].enabled)
        .map((key) => {
          const Icon = icons[key]
          const page = settings.pages[key]
          return (
            <Link
              key={key}
              href={links[key]}
              aria-current={active === key ? 'page' : undefined}
              aria-label={siteText(page.label, settings)}
            >
              <NavigationLabel
                icon={Icon}
                label={siteText(page.label, settings)}
                shortLabel={siteText(page.shortLabel, settings)}
              />
            </Link>
          )
        })}
    </nav>
  )
}
