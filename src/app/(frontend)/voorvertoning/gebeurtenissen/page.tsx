import { requireSiteModule } from '@/lib/site-modules'
import { sitePageMetadata } from '@/lib/get-site-settings'
import { EventsOverview } from '@/components/events/EventsOverview'
import { demoFamily } from '@/lib/demo'
export const dynamic = 'force-dynamic'
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  await requireSiteModule('events', '/voorvertoning')
  return (
    <EventsOverview
      family={demoFamily}
      demo
      treeHref="/voorvertoning"
      initialEvent={(await searchParams).event}
    />
  )
}

export const generateMetadata = () => sitePageMetadata('events')
