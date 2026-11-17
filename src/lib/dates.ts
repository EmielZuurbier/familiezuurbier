import type { PartialDate, Person } from './types'
export function dateError(date: PartialDate): string | undefined {
  const { year, month, day } = date
  if (year != null && (!Number.isInteger(year) || year < 1 || year > 9999))
    return 'Vul een geldig jaartal in.'
  if (month != null && (!Number.isInteger(month) || month < 1 || month > 12))
    return 'Een maand is 1 tot en met 12.'
  if (day != null && (!Number.isInteger(day) || day < 1 || day > 31))
    return 'Vul een geldige dag in.'
  // A leap year permits 29 February when the year is unknown.
  if (month && day && day > new Date(Date.UTC(year ?? 2000, month, 0)).getUTCDate())
    return 'Deze dag bestaat niet in deze maand.'
}
const months = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
]
export function formatDate(d: PartialDate): string {
  if (!d.year && !d.month && !d.day) return 'Onbekend'
  return [
    d.day,
    d.month ? months[d.month - 1] : d.day ? '(maand onbekend)' : null,
    d.year ?? '(jaar onbekend)',
  ]
    .filter(Boolean)
    .join(' ')
}
export function years(p: Person, { compact = false }: { compact?: boolean } = {}): string {
  const birth = p.birth.year ?? '?'
  return p.lifeStatus === 'deceased'
    ? `${birth} – ${p.death.year ?? '?'}`
    : p.lifeStatus === 'living'
      ? `${birth} – heden`
      : compact
        ? `${birth}`
        : `${birth} · levensstatus onbekend`
}
function fullDate(d: PartialDate): Date | null {
  if (!d.year || !d.month || !d.day || dateError(d)) return null
  // Date.UTC maps 1–99 to 1901–1999; setUTCFullYear preserves historic years.
  const result = new Date(0)
  result.setUTCFullYear(d.year, d.month - 1, d.day)
  result.setUTCHours(0, 0, 0, 0)
  return result
}
function dutchCalendarDate(now: Date): Date {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now)
  const value = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  return fullDate({ year: value('year'), month: value('month'), day: value('day') })!
}

export function age(p: Person, now = new Date()): string | null {
  const start = fullDate(p.birth)
  const end =
    p.lifeStatus === 'deceased'
      ? fullDate(p.death)
      : p.lifeStatus === 'living'
        ? dutchCalendarDate(now)
        : null
  if (!start || !end || end < start) return null
  let n = end.getUTCFullYear() - start.getUTCFullYear()
  if (
    end.getUTCMonth() < start.getUTCMonth() ||
    (end.getUTCMonth() === start.getUTCMonth() && end.getUTCDate() < start.getUTCDate())
  )
    n--
  return `${n} jaar${p.lifeStatus === 'deceased' ? ' geworden' : ''}`
}
export function dateOrderError(birth: PartialDate, death: PartialDate): boolean {
  const a = fullDate(birth),
    b = fullDate(death)
  if (a && b) return b < a
  return !!(birth.year && death.year && death.year < birth.year)
}
