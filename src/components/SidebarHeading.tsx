'use client'
import { siteText, type SiteModule } from '@/lib/site-settings'
import { useSiteSettings } from './SiteSettingsProvider'

export function SidebarHeading({ module, demo }: { module: SiteModule; demo: boolean }) {
  const settings = useSiteSettings()
  const page = settings.pages[module]
  return (
    <div className={`sidebar-heading ${module === 'map' ? 'map-sidebar-heading' : ''}`}>
      <span className="eyebrow">{siteText(page.eyebrow, settings)}</span>
      <h1>
        {siteText(demo ? page.exampleTitle : page.title, settings)}
        <br />
        <em>{siteText(demo ? page.exampleTitleAccent : page.titleAccent, settings)}</em>
      </h1>
      <p>{siteText(page.description, settings)}</p>
    </div>
  )
}
