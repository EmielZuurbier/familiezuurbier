import { describe, expect, it } from 'vitest'
import { dateError, dateOrderError, age, formatDate, years } from '../src/lib/dates'
import { demoFamily } from '../src/lib/demo'
import { layoutFamily, CARD_WIDTH, CARD_HEIGHT } from '../src/lib/layout'
import { parentageError, relationKey } from '../src/lib/relations'
import type { Family, Person } from '../src/lib/types'
const person = (id: string): Person => ({
  id,
  name: id,
  birth: {},
  death: {},
  lifeStatus: 'unknown',
})
const family = (ids: string[], arcs: string[][] = [], pairs: string[][] = []): Family => ({
  people: ids.map(person),
  parentages: arcs.map(([parent, child], i) => ({ id: String(i), parent, child })),
  partnerships: pairs.map(([personA, personB], i) => ({
    id: String(i),
    personA,
    personB,
    status: 'unknown',
  })),
})
describe('onvolledige datums en levensstatus', () => {
  it('accepteert jaar, maand/dag zonder jaar en geheel onbekend', () => {
    for (const value of [
      {},
      { year: 1916 },
      { month: 2, day: 29 },
      { year: 2000, month: 2, day: 29 },
    ])
      expect(dateError(value)).toBeUndefined()
    expect(formatDate({ year: 1916 })).toBe('1916')
    expect(formatDate({ month: 2, day: 29 })).toContain('jaar onbekend')
  })
  it('weigert ongeldige kalenderdatums en fracties', () => {
    for (const value of [
      { year: 1900, month: 2, day: 29 },
      { month: 4, day: 31 },
      { year: 2000.5 },
      { month: 0 },
      { day: 0 },
      { month: 13 },
    ])
      expect(dateError(value)).toBeDefined()
  })
  it('leidt geen leven of leeftijd af uit een ontbrekend overlijden', () => {
    const p = { ...person('1'), birth: { year: 1920, month: 1, day: 1 } }
    expect(age(p)).toBeNull()
    expect(years(p)).toContain('onbekend')
    expect(years(p, { compact: true })).toBe('1920')
  })
  it('berekent leeftijd alleen met voldoende bevestigde gegevens', () => {
    const p = {
      ...person('1'),
      birth: { year: 2000, month: 11, day: 17 },
      lifeStatus: 'living' as const,
    }
    expect(age(p, new Date('2026-11-16T12:00:00Z'))).toBe('25 jaar')
    expect(age(p, new Date('2026-11-17T12:00:00Z'))).toBe('26 jaar')
    expect(age({ ...p, birth: { year: 2000 } })).toBeNull()
    expect(age({ ...p, lifeStatus: 'deceased', death: { year: 2020, month: 1, day: 1 } })).toBe(
      '19 jaar geworden',
    )
    expect(dateOrderError({ year: 2000 }, { year: 1999 })).toBe(true)
  })
})
describe('kalendergrenzen bij leeftijd', () => {
  it('gebruikt de Nederlandse kalenderdag bij een verjaardag', () => {
    const p = {
      ...person('1'),
      birth: { year: 2000, month: 11, day: 17 },
      lifeStatus: 'living' as const,
    }
    expect(age(p, new Date('2026-11-16T23:30:00Z'))).toBe('26 jaar')
  })
  it('behoudt historische jaartallen onder 100', () => {
    const p = {
      ...person('1'),
      birth: { year: 50, month: 1, day: 1 },
      death: { year: 100, month: 1, day: 1 },
      lifeStatus: 'deceased' as const,
    }
    expect(age(p)).toBe('50 jaar geworden')
  })
})
describe('relaties', () => {
  const rows = family(
    ['a', 'b', 'c'],
    [
      ['a', 'b'],
      ['b', 'c'],
    ],
  ).parentages
  it('weigert zelfrelaties, duplicaten en indirecte cycli', () => {
    expect(parentageError('a', 'a', rows)).toBeDefined()
    expect(parentageError('a', 'b', rows)).toContain('bestaat al')
    expect(parentageError('c', 'a', rows)).toContain('cirkel')
    expect(parentageError('a', 'c', rows)).toBeUndefined()
  })
  it('staat bewerken zonder valse duplicaatmelding toe', () =>
    expect(parentageError('a', 'b', rows, '0')).toBeUndefined())
  it('gebruikt dezelfde sleutel voor omgekeerde partners', () => {
    expect(relationKey('1', '2', true)).toBe(relationKey('2', '1', true))
    expect(relationKey('1', '2')).not.toBe(relationKey('2', '1'))
  })
})
describe('automatische generatie- en partnerindeling', () => {
  it('plaatst ouders boven kinderen en partners op dezelfde generatie', () => {
    const positions = layoutFamily(demoFamily),
      byId = new Map(positions.map((p) => [p.id, p]))
    for (const r of demoFamily.parentages)
      expect(byId.get(r.parent)!.y).toBeLessThan(byId.get(r.child)!.y)
    for (const r of demoFamily.partnerships)
      expect(byId.get(r.personA)!.y).toBe(byId.get(r.personB)!.y)
    for (const a of positions)
      for (const b of positions)
        if (a.id !== b.id)
          expect(Math.abs(a.x - b.x) >= CARD_WIDTH || Math.abs(a.y - b.y) >= CARD_HEIGHT).toBe(true)
  })
  it('ondersteunt meerdere partners, een losse ouder en niet-verbonden personen', () => {
    const data = family(
      ['a', 'b', 'c', 'd', 'e', 'f'],
      [
        ['a', 'd'],
        ['b', 'd'],
        ['a', 'e'],
      ],
      [
        ['a', 'b'],
        ['a', 'c'],
      ],
    )
    const p = layoutFamily(data),
      byId = new Map(p.map((p) => [p.id, p]))
    expect(p).toHaveLength(6)
    expect(byId.get('a')!.y).toBe(byId.get('c')!.y)
    expect(byId.get('e')!.y).toBeGreaterThan(byId.get('a')!.y)
  })
  it('kan complexe partnerschappen tekenen zonder generaties in een cirkel te dwingen', () => {
    const p = layoutFamily(
      family(
        ['a', 'b', 'c'],
        [
          ['a', 'b'],
          ['b', 'c'],
        ],
        [['a', 'c']],
      ),
    )
    expect(p.find((p) => p.id === 'a')!.y).toBeLessThan(p.find((p) => p.id === 'c')!.y)
  })
  it('is deterministisch bij een andere personenvolgorde en verwerkt een nieuw kind', () => {
    expect(layoutFamily({ ...demoFamily, people: [...demoFamily.people].reverse() })).toEqual(
      layoutFamily(demoFamily),
    )
    const data = family(['a', 'b'], [['a', 'b']])
    data.people.push(person('c'))
    data.parentages.push({ id: 'new', parent: 'b', child: 'c' })
    expect(layoutFamily(data).find((p) => p.id === 'c')!.generation).toBe(2)
  })
  it('verwerkt leeg en weigert cyclische brongegevens', () => {
    expect(layoutFamily(family([]))).toEqual([])
    expect(() =>
      layoutFamily(
        family(
          ['a', 'b'],
          [
            ['a', 'b'],
            ['b', 'a'],
          ],
        ),
      ),
    ).toThrow('cirkel')
  })
})
