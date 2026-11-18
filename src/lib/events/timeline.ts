import type { FamilyEvent } from './types'

export function eventOrder(a: FamilyEvent, b: FamilyEvent): number {
  for (const part of ['year', 'month', 'day'] as const) {
    const difference = (b.date[part] ?? 0) - (a.date[part] ?? 0)
    if (difference) return difference
  }
  return a.title.localeCompare(b.title, 'nl') || a.id.localeCompare(b.id)
}
export function eventsForPerson(events: FamilyEvent[] | undefined, person: string): FamilyEvent[] {
  return (events ?? []).filter((event) => event.people.includes(person)).toSorted(eventOrder)
}
export function eventHref(base: string, id: string): string {
  return `${base === '/' ? '' : base}/gebeurtenissen?event=${encodeURIComponent(id)}`
}
