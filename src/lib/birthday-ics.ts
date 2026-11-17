import type { Person } from './types'
import { dateError, formatDate } from './dates'

const text = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')

// RFC 5545 folds at 75 UTF-8 octets, never halfway through a character.
function fold(line: string): string {
  const encoder = new TextEncoder()
  const parts: string[] = []
  let current = '',
    bytes = 0
  for (const character of line) {
    const length = encoder.encode(character).length
    if (bytes + length > 75) {
      parts.push(current)
      current = ' '
      bytes = 1
    }
    current += character
    bytes += length
  }
  parts.push(current)
  return parts.join('\r\n')
}

export function birthdayIcs(
  people: Person[],
  {
    month = null,
    namespace = 'familieboom',
    now = new Date(),
    calendarName = 'Familieverjaardagen',
  }: { month?: number | null; namespace?: string; now?: Date; calendarName?: string } = {},
) {
  if (month !== null && (!Number.isInteger(month) || month < 1 || month > 12))
    throw new Error('Kies een geldige maand.')
  const birthdays = people
    .filter(
      (person) =>
        person.birth.month &&
        person.birth.day &&
        !dateError(person.birth) &&
        (month === null || person.birth.month === month),
    )
    .sort(
      (a, b) =>
        a.birth.month! - b.birth.month! ||
        a.birth.day! - b.birth.day! ||
        a.id.localeCompare(b.id, 'nl', { numeric: true }),
    )
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Familieboom//Verjaardagen//NL',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${text(calendarName)}`,
  ]
  for (const person of birthdays) {
    const { year, month, day } = person.birth
    // 2000 is only a recurrence anchor for an unknown year, including 29 February.
    // The real birth year is never inferred or put in a calendar-specific age field.
    const start = `${String(year ?? 2000).padStart(4, '0')}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
    const description = `Geboortedatum: ${formatDate(person.birth)}.${person.lifeStatus === 'deceased' ? '\nOverleden.' : ''}`
    lines.push(
      'BEGIN:VEVENT',
      `UID:familieboom-birthday-${encodeURIComponent(person.id)}@${encodeURIComponent(namespace)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      'DURATION:P1D',
      `RRULE:FREQ=YEARLY;BYMONTH=${month};BYMONTHDAY=${day}`,
      `SUMMARY:${text(`${person.lifeStatus === 'deceased' ? 'Geboortedag' : 'Verjaardag'} van ${person.name}`)}`,
      `DESCRIPTION:${text(description)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return { content: lines.map(fold).join('\r\n') + '\r\n', count: birthdays.length }
}
