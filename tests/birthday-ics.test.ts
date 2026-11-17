import { describe, expect, it } from 'vitest'
import { birthdayIcs } from '../src/lib/birthday-ics'
import type { Person } from '../src/lib/types'

const now = new Date('2026-11-16T20:00:00.000Z')
const options = { namespace: 'https://familie.example.invalid', now }
const person = (
  id: string,
  birth: Person['birth'] = { year: 1980, month: 11, day: 16 },
): Person => ({ id, name: `Fictief ${id}`, birth, death: {}, lifeStatus: 'unknown' })
const unfold = (value: string) => value.replace(/\r\n /g, '')
const uid = (value: string) =>
  unfold(value)
    .match(/^UID:(.+)$/m)![1]
    .trim()

describe('Download van verjaardagen als iCalendar', () => {
  it('maakt jaarlijks herhaalde afspraken voor de hele dag, zonder een vaste leeftijd of bezette tijd', () => {
    const result = birthdayIcs([person('1')], options)
    expect(result.count).toBe(1)
    expect(result.content.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(result.content.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(result.content).toContain('DTSTAMP:20261116T200000Z\r\n')
    expect(result.content).toContain('DTSTART;VALUE=DATE:19801116\r\nDURATION:P1D\r\n')
    expect(result.content).toContain('RRULE:FREQ=YEARLY;BYMONTH=11;BYMONTHDAY=16\r\n')
    expect(result.content).toContain('TRANSP:TRANSPARENT\r\n')
    expect(unfold(result.content)).toContain('DESCRIPTION:Geboortedatum: 16 november 1980.')
    expect(result.content).not.toMatch(/TZID|VALARM|46 jaar|DTEND/)
  })
  it('exporteert alleen de meegegeven personen uit de geselecteerde maand en wijzigt niets', () => {
    const people = [person('2', { year: 2000, month: 4, day: 1 }), person('1')]
    const before = JSON.stringify(people)
    const result = birthdayIcs(people, { ...options, month: 11 })
    expect(result.count).toBe(1)
    expect(result.content).toContain('SUMMARY:Verjaardag van Fictief 1')
    expect(result.content).not.toContain('Fictief 2')
    expect(JSON.stringify(people)).toBe(before)
    expect(birthdayIcs([...people].reverse(), options)).toEqual(birthdayIcs(people, options))
    for (const month of [0, 13, NaN, 2.5])
      expect(() => birthdayIcs(people, { month })).toThrow('maand')
  })
  it('slaat ontbrekende en ongeldige dagen over en houdt een onbekend geboortejaar expliciet onbekend', () => {
    const result = birthdayIcs(
      [
        person('a', {}),
        person('b', { year: 1950 }),
        person('c', { month: 2, day: 30 }),
        person('d', { month: 6, day: 5 }),
      ],
      options,
    )
    expect(result.count).toBe(1)
    expect(result.content).toContain('DTSTART;VALUE=DATE:20000605')
    expect(unfold(result.content)).toContain('Geboortedatum: 5 juni (jaar onbekend).')
    expect(result.content).not.toContain('Geboortedatum: 5 juni 2000')
  })
  it('behoudt 29 februari en onderscheidt een geboortedag van een overleden persoon', () => {
    const result = birthdayIcs(
      [{ ...person('1', { month: 2, day: 29 }), lifeStatus: 'deceased' }],
      options,
    )
    expect(result.content).toContain('DTSTART;VALUE=DATE:20000229')
    expect(result.content).toContain('RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29')
    expect(result.content).toContain('SUMMARY:Geboortedag van Fictief 1')
    expect(unfold(result.content)).toContain('(jaar onbekend).\\nOverleden.')
    expect(result.content).not.toMatch(/BYMONTHDAY=28|BYMONTH=3/)
  })
  it('geeft dezelfde persoon een stabiele UID, ook bij hernoemen of een latere export', () => {
    const p = person('7')
    const first = birthdayIcs([p], options)
    const later = birthdayIcs([{ ...p, name: 'Andere fictieve naam' }], {
      ...options,
      now: new Date('2027-02-01T00:00:00Z'),
    })
    expect(uid(first.content)).toBe(uid(later.content))
    expect(uid(first.content)).not.toBe(
      uid(birthdayIcs([p], { ...options, namespace: 'voorbeeld' }).content),
    )
    expect(uid(first.content)).not.toBe(uid(birthdayIcs([person('8')], options).content))
  })
  it('escapet tekst en voorkomt dat een naam extra agenda-afspraken of eigenschappen invoegt', () => {
    const result = birthdayIcs(
      [{ ...person('1'), name: 'Naam, test; \\ voorbeeld\r\nBEGIN:VEVENT\nEND:VCALENDAR' }],
      options,
    )
    expect(result.content.match(/\r\nBEGIN:VEVENT\r\n/g)).toHaveLength(1)
    expect(unfold(result.content)).toContain(
      'Naam\\, test\\; \\\\ voorbeeld\\nBEGIN:VEVENT\\nEND:VCALENDAR',
    )
    expect(result.content.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
  })
  it('vouwt lange UTF-8-regels op maximaal 75 bytes zonder accenten of emoji te beschadigen', () => {
    const name = 'Élodie 🌳 '.repeat(25)
    const result = birthdayIcs([{ ...person('1'), name }], options)
    const encoder = new TextEncoder()
    for (const line of result.content.split('\r\n'))
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75)
    expect(unfold(result.content)).toContain(`SUMMARY:Verjaardag van ${name}\r\n`)
    expect(result.content).not.toContain('\uFFFD')
  })
  it('neemt alleen de naam, geboortedatum en eventueel overlijden mee, en kan lege invoer verwerken', () => {
    const p = {
      ...person('1'),
      birthSurname: 'Privégeboortenaam',
      currentResidence: 'Privéwoonplaats',
      birthPlace: 'Privégeboorteplaats',
      photo: { url: '/api/media/file/privefoto.webp' },
    }
    const content = birthdayIcs([p], options).content
    expect(content).not.toMatch(/Privé|privefoto|LOCATION:|ATTACH:|URL:/)
    expect(birthdayIcs([], options)).toMatchObject({ count: 0 })
    expect(birthdayIcs([], options).content).not.toContain('VEVENT')
  })
})
