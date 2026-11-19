import { requireSiteModule } from '@/lib/site-modules'
import { sitePageMetadata } from '@/lib/get-site-settings'
import { EventsOverview } from '@/components/events/EventsOverview'
import { FamilyUnavailable } from '@/components/FamilyUnavailable'
import { loadFamily } from '@/lib/load-family'
import { GoogleTagManager } from '@/components/GoogleTagManager'
export const dynamic = 'force-dynamic'
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  await requireSiteModule('events')
  const result = await loadFamily()
  if (result.kind !== 'ready') return <FamilyUnavailable kind={result.kind} />
  return (
    <>
      <GoogleTagManager />
      <EventsOverview
        family={result.family}
        demo={result.demo}
        treeHref="/"
        viewer={result.viewer}
        initialEvent={(await searchParams).event}
      />
    </>
  )
}

export const generateMetadata = () => sitePageMetadata('events')
