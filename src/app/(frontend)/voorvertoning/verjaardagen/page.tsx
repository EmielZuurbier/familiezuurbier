import { requireSiteModule } from '@/lib/site-modules'
import { sitePageMetadata } from '@/lib/get-site-settings'
import { BirthdayCalendar } from '@/components/BirthdayCalendar'
import { demoBirthdayFamily } from '@/lib/demo-birthdays'
import { calendarToday } from '@/lib/birthdays'
export const dynamic = 'force-dynamic'
export default async function Page() {
  await requireSiteModule('calendar', '/voorvertoning')
  return (
    <BirthdayCalendar
      family={demoBirthdayFamily}
      demo
      today={calendarToday()}
      treeHref="/voorvertoning"
      mapHref="/voorvertoning/kaart"
    />
  )
}

export const generateMetadata = () => sitePageMetadata('calendar')
