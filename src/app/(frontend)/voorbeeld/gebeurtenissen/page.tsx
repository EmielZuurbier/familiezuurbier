import { EventsOverview } from '@/components/events/EventsOverview'
import { demoFamily } from '@/lib/demo'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Voorbeeld gebeurtenissen · Familie Zuurbier' }
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  return (
    <EventsOverview
      family={demoFamily}
      demo
      treeHref="/voorbeeld"
      initialEvent={(await searchParams).event}
    />
  )
}
