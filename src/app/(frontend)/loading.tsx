'use client'
import { usePathname } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { FamilyBrand } from '@/components/FamilyBrand'
import { WorkspaceHeader } from '@/components/WorkspaceHeader'
import { useSiteSettings } from '@/components/SiteSettingsProvider'
import { siteText } from '@/lib/site-settings'

export default function Loading() {
  const pathname = usePathname()
  const settings = useSiteSettings()
  const base = pathname.startsWith('/voorvertoning')
    ? '/voorvertoning'
    : pathname.startsWith('/voorbeeld')
      ? '/voorbeeld'
      : ''
  const localPath = pathname.slice(base.length)
  const active =
    localPath === '/kaart'
      ? 'map'
      : localPath === '/verjaardagen'
        ? 'calendar'
        : localPath === '/gebeurtenissen'
          ? 'events'
          : 'tree'
  const status = (
    <div className="view-loading-message" role="status">
      <LoaderCircle size={26} aria-hidden="true" />
      <p>Even geduld, de weergave wordt geladen…</p>
    </div>
  )
  if (!['', '/', '/kaart', '/verjaardagen', '/gebeurtenissen'].includes(localPath))
    return (
      <main className="view-loading-standalone" aria-busy="true">
        {status}
      </main>
    )
  return (
    <main className="app-shell view-loading" aria-busy="true">
      <aside className="sidebar">
        <FamilyBrand />
        <div className="search-area loading-search" aria-hidden="true" />
      </aside>
      <section className="workspace" aria-label="Weergave laden">
        <WorkspaceHeader
          title={siteText(settings.pages[active].workspaceTitle, settings)}
          active={active}
          treeHref={base || '/'}
          mapHref={`${base}/kaart`}
        />
        {status}
      </section>
    </main>
  )
}
