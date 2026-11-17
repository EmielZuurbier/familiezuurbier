import type { Person } from './types'
import { dateError, formatDate } from './dates'

export const birthdayMonths = [
  'Januari',
  'Februari',
  'Maart',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Augustus',
  'September',
  'Oktober',
  'November',
  'December',
]
export type CalendarDay = { year: number; month: number; day: number }
export type Birthday = {
  person: Person
  month: number
  day: number
  birthLabel: string
  ageLabel: string
  today: boolean
  leapDay: boolean
}
export function calendarToday(now = new Date()): CalendarDay {
  const parts = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now)
  const value = (name: string) => Number(parts.find((part) => part.type === name)!.value)
  return { year: value('year'), month: value('month'), day: value('day') }
}
function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}
function ageLabel(person: Person, year: number, today: CalendarDay) {
  const birth = person.birth
  if (!birth.year) return 'Geboortejaar onbekend'
  const years = year - birth.year
  if (years < 0) return `Geboren na ${year}`
  if (years === 0) return `Geboortejaar ${year}`
  if (person.lifeStatus !== 'living') return `Zou ${years} jaar worden`
  // A 29 February birthday keeps its real date. Do not silently move it to
  // 28 February or 1 March when the family has not chosen that convention.
  if (birth.month === 2 && birth.day === 29 && !isLeapYear(year)) return `${years} jaar in ${year}`
  const difference = year - today.year || birth.month! - today.month || birth.day! - today.day
  return difference < 0
    ? `Werd ${years} jaar`
    : difference > 0
      ? `Wordt ${years} jaar`
      : `Vandaag ${years} jaar`
}
export function birthdayCalendar(people: Person[], year: number, today: CalendarDay) {
  if (!Number.isInteger(year) || year < 1 || year > 9999)
    throw new Error('Kies een geldig kalenderjaar.')
  const months = birthdayMonths.map((label, i) => ({
    month: i + 1,
    label,
    birthdays: [] as Birthday[],
  }))
  const incomplete: Person[] = []
  for (const person of people) {
    const { month, day } = person.birth
    if (!month || !day || dateError(person.birth)) {
      incomplete.push(person)
      continue
    }
    months[month - 1].birthdays.push({
      person,
      month,
      day,
      birthLabel: formatDate(person.birth),
      ageLabel: ageLabel(person, year, today),
      today: year === today.year && month === today.month && day === today.day,
      leapDay: month === 2 && day === 29 && !isLeapYear(year),
    })
  }
  const byName = (a: Person, b: Person) =>
    a.name.localeCompare(b.name, 'nl') || a.id.localeCompare(b.id, 'nl', { numeric: true })
  months.forEach((month) =>
    month.birthdays.sort((a, b) => a.day - b.day || byName(a.person, b.person)),
  )
  incomplete.sort(byName)
  return { months, incomplete, completeCount: people.length - incomplete.length }
}
