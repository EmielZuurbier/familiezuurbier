import { EventsOverview } from '@/components/events/EventsOverview'
import { FamilyUnavailable } from '@/components/FamilyUnavailable'
import { loadFamily } from '@/lib/load-family'
import { familyPageTitle } from '@/lib/branding'
import { GoogleTagManager } from '@/components/GoogleTagManager'
export const dynamic = 'force-dynamic'
export const metadata = { title: familyPageTitle('Gebeurtenissen') }
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
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
