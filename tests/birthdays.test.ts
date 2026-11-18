import { describe, expect, it } from 'vitest'
import { birthdayCalendar, calendarToday, type CalendarDay } from '../src/lib/birthdays'
import type { Person, PartialDate } from '../src/lib/types'

const today: CalendarDay = { year: 2026, month: 11, day: 16 }
const person = (
  id: string,
  birth: PartialDate,
  status: Person['lifeStatus'] = 'living',
): Person => ({ id, name: `Fictief ${id}`, birth, death: {}, lifeStatus: status })
const entries = (people: Person[], year = 2026, day = today) =>
  birthdayCalendar(people, year, day).months.flatMap((month) => month.birthdays)

describe('Verjaardagskalender', () => {
  it('sorteert per maand, dag en naam zonder de invoer te veranderen', () => {
    const people = [
      person('c', { year: 2000, month: 12, day: 4 }),
      person('b', { year: 1990, month: 1, day: 4 }),
      person('a', { year: 2001, month: 1, day: 4 }),
    ]
    const before = JSON.stringify(people)
    expect(entries(people).map((entry) => entry.person.id)).toEqual(['a', 'b', 'c'])
    expect(entries([...people].reverse()).map((entry) => entry.person.id)).toEqual(['a', 'b', 'c'])
    expect(JSON.stringify(people)).toBe(before)
  })
  it('onderscheidt al jarig geweest, vandaag en de volgende verjaardag in het kalenderjaar', () => {
    const result = entries([
      person('gisteren', { year: 2000, month: 11, day: 15 }),
      person('vandaag', { year: 2000, month: 11, day: 16 }),
      person('morgen', { year: 2000, month: 11, day: 17 }),
    ])
    expect(result.map((entry) => entry.ageLabel)).toEqual([
      'Werd 26 jaar',
      'Vandaag 26 jaar',
      'Wordt 26 jaar',
    ])
    expect(result.filter((entry) => entry.today).map((entry) => entry.person.id)).toEqual([
      'vandaag',
    ])
    expect(result[1].birthLabel).toBe('16 november 2000')
  })
  it('past leeftijden aan op het gekozen jaar en markeert alleen vandaag in het huidige jaar', () => {
    const p = person('a', { year: 2000, month: 11, day: 16 })
    expect(entries([p], 2025)[0]).toMatchObject({ ageLabel: 'Werd 25 jaar', today: false })
    expect(entries([p], 2027)[0]).toMatchObject({ ageLabel: 'Wordt 27 jaar', today: false })
  })
  it('gebruikt de Nederlandse kalenderdag, ook rond middernacht en de jaarwisseling', () => {
    expect(calendarToday(new Date('2026-11-16T23:30:00Z'))).toEqual({
      year: 2026,
      month: 11,
      day: 17,
    })
    expect(calendarToday(new Date('2026-12-31T23:30:00Z'))).toEqual({
      year: 2027,
      month: 1,
      day: 1,
    })
    expect(calendarToday(new Date('2026-07-05T22:30:00Z'))).toEqual({
      year: 2026,
      month: 7,
      day: 6,
    })
  })
  it('toont bekende dag en maand zonder een onbekend geboortejaar of leeftijd in te vullen', () => {
    const result = entries([person('a', { month: 3, day: 5 })])[0]
    expect(result.ageLabel).toBe('Geboortejaar onbekend')
    expect(result.birthLabel).toBe('5 maart (jaar onbekend)')
  })
  it('houdt onvolledige en ongeldige datums apart, zonder personen uit het overzicht te verliezen', () => {
    const people = [
      person('a', {}),
      person('b', { year: 1950 }),
      person('c', { year: 2000, month: 2 }),
      person('d', { year: 2000, month: 2, day: 30 }),
      person('e', { day: 12 }),
    ]
    const result = birthdayCalendar(people, 2026, today)
    expect(result.completeCount).toBe(0)
    expect(result.incomplete.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(result.months.every((month) => month.birthdays.length === 0)).toBe(true)
  })
  it('gebruikt alleen bij overleden personen de tekst zou worden', () => {
    const dead = entries([person('a', { year: 1920, month: 2, day: 3 }, 'deceased')])[0]
    const unknown = entries([person('a', { year: 1920, month: 2, day: 3 }, 'unknown')])[0]
    expect(dead.ageLabel).toBe('Zou 106 jaar worden')
    expect(unknown.ageLabel).toBe('Werd 106 jaar')
  })
  it('toont bij kinderen zonder overlijdensvinkje de gewone verjaardagstekst', () => {
    for (const status of ['unknown', 'living'] as const) {
      const result = entries([
        person('gisteren', { year: 2020, month: 11, day: 15 }, status),
        person('vandaag', { year: 2020, month: 11, day: 16 }, status),
        person('morgen', { year: 2020, month: 11, day: 17 }, status),
      ])
      expect(result.map((entry) => entry.ageLabel)).toEqual([
        'Werd 6 jaar',
        'Vandaag 6 jaar',
        'Wordt 6 jaar',
      ])
      expect(result.every((entry) => !entry.ageLabel.startsWith('Zou'))).toBe(true)
    }
    expect(
      entries([person('herdenken', { year: 2020, month: 11, day: 17 }, 'deceased')])[0].ageLabel,
    ).toBe('Zou 6 jaar worden')
  })
  it('behoudt 29 februari en kiest geen ongevraagde vervangende feestdag', () => {
    const p = person('a', { year: 2000, month: 2, day: 29 })
    expect(entries([p])[0]).toMatchObject({
      day: 29,
      month: 2,
      leapDay: true,
      ageLabel: '26 jaar in 2026',
      today: false,
    })
    expect(entries([p], 2028)[0]).toMatchObject({
      day: 29,
      month: 2,
      leapDay: false,
      ageLabel: 'Wordt 28 jaar',
    })
    expect(entries([person('a', { month: 2, day: 29 })])[0].ageLabel).toBe('Geboortejaar onbekend')
  })
  it('geeft geen negatieve leeftijd voor een toekomstig geboortejaar of een nulde verjaardag', () => {
    expect(entries([person('a', { year: 2027, month: 5, day: 2 })])[0].ageLabel).toBe(
      'Geboren na 2026',
    )
    expect(entries([person('a', { year: 2026, month: 5, day: 2 })])[0].ageLabel).toBe(
      'Geboortejaar 2026',
    )
  })
  it('weigert ongeldige kalenderjaren en verwerkt lege invoer', () => {
    for (const year of [0, -1, 10000, 2026.5, NaN])
      expect(() => birthdayCalendar([], year, today)).toThrow('kalenderjaar')
    expect(birthdayCalendar([], 2026, today)).toMatchObject({ completeCount: 0, incomplete: [] })
    expect(birthdayCalendar([], 2026, today).months).toHaveLength(12)
  })
})
