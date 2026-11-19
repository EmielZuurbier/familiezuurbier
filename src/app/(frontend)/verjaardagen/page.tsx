import { requireSiteModule } from '@/lib/site-modules'
import { sitePageMetadata } from '@/lib/get-site-settings'
import { FamilyUnavailable } from '@/components/FamilyUnavailable'
import { BirthdayCalendar } from '@/components/BirthdayCalendar'
import { loadFamily } from '@/lib/load-family'
import { calendarToday } from '@/lib/birthdays'
import { GoogleTagManager } from '@/components/GoogleTagManager'
export const dynamic = 'force-dynamic'
export default async function Page() {
  await requireSiteModule('calendar')
  const result = await loadFamily()
  if (result.kind !== 'ready') return <FamilyUnavailable kind={result.kind} />
  return (
    <>
      <GoogleTagManager />
      <BirthdayCalendar
        family={result.family}
        demo={result.demo}
        today={calendarToday()}
        treeHref="/"
        mapHref="/kaart"
        viewer={result.viewer}
      />
    </>
  )
}

export const generateMetadata = () => sitePageMetadata('calendar')
