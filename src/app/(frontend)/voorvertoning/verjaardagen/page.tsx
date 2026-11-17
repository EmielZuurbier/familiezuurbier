import { BirthdayCalendar } from '@/components/BirthdayCalendar'
import { demoBirthdayFamily } from '@/lib/demo-birthdays'
import { calendarToday } from '@/lib/birthdays'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Voorbeeld verjaardagskalender · Familie Zuurbier' }
export default function Page() {
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
