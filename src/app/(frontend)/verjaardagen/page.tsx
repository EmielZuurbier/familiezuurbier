import { FamilyUnavailable } from '@/components/FamilyUnavailable'
import { BirthdayCalendar } from '@/components/BirthdayCalendar'
import { loadFamily } from '@/lib/load-family'
import { calendarToday } from '@/lib/birthdays'
import { familyPageTitle } from '@/lib/branding'
export const dynamic = 'force-dynamic'
export const metadata = { title: familyPageTitle('Verjaardagskalender') }
export default async function Page() {
  const result = await loadFamily()
  if (result.kind !== 'ready') return <FamilyUnavailable kind={result.kind} />
  return (
    <BirthdayCalendar
      family={result.family}
      demo={result.demo}
      today={calendarToday()}
      treeHref="/"
      mapHref="/kaart"
      viewer={result.viewer}
    />
  )
}
