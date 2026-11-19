'use client'
import Link from 'next/link'
import { CalendarDays, GitBranch, MapPin, BookOpen } from 'lucide-react'
import { useSiteSettings } from './SiteSettingsProvider'
import { moduleKeys, siteText } from '@/lib/site-settings'

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
              <Icon size={15} />
              <span className="view-full-label">{siteText(page.label, settings)}</span>
              <span className="view-short-label" aria-hidden="true">
                {siteText(page.shortLabel, settings)}
              </span>
            </Link>
          )
        })}
    </nav>
  )
}
