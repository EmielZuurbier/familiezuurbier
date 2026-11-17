import { describe, it, expect } from 'vitest'
import { childOrder } from '../src/lib/child-order'
import { effectiveParentages } from '../src/lib/relations'
import { layoutFamily, layoutBranchingFamily } from '../src/lib/layout'
import { familyFocusOptions, familyFocusPlacements } from '../src/lib/family-focus'
import type { Family, Person } from '../src/lib/types'

const person = (id: string, birth: Person['birth'] = {}): Person => ({
  id,
  name: `Fictief ${id}`,
  birth,
  death: {},
  lifeStatus: 'unknown',
})
function fixture(): Family {
  const partnerships: Family['partnerships'] = [
    {
      id: 'root',
      personA: 'p1',
      personB: 'p2',
      children: ['20', '10', '90', '50', '70'],
      status: 'current',
    },
    // The youngest child's partner has both a lower ID and an earlier birth date.
    { id: 'young-couple', personA: '1', personB: '10', status: 'current' },
    { id: 'old-couple', personA: '90', personB: '91', children: ['g2', 'g1'], status: 'current' },
  ]
  return {
    people: [
      person('p1', { year: 1950 }),
      person('p2', { year: 1951 }),
      person('90', { year: 1978, month: 5, day: 2 }),
      person('70', { year: 1980 }),
      person('10', { year: 1990, month: 6, day: 3 }),
      person('20'),
      person('50'),
      person('1', { year: 1960 }),
      person('91', { year: 1979 }),
      person('g2', { year: 2010 }),
      person('g1', { year: 2005 }),
    ],
    partnerships,
    parentages: effectiveParentages([], partnerships),
  }
}
const ordered = (family: Family) =>
  [...family.partnerships[0].children!].sort(childOrder(family, ['p1', 'p2']))

describe('Geboortevolgorde per gezin', () => {
  it('sorteert op geboortejaar, maand en dag, met ongedateerde kinderen in lijstvolgorde achteraan', () => {
    const family = fixture()
    expect(ordered(family)).toEqual(['90', '70', '10', '20', '50'])
    family.people.find((p) => p.id === '20')!.birth = { month: 1, day: 1 }
    // A birthday without a birth year does not reveal who is older.
    expect(ordered(family)).toEqual(['90', '70', '10', '20', '50'])
  })
  it('onderscheidt maanden en dagen en gebruikt de lijst bij gelijke of onvolledige datums', () => {
    const family: Family = {
      people: [
        person('a', { year: 2000, month: 4, day: 2 }),
        person('b', { year: 2000, month: 1, day: 3 }),
        person('c', { year: 2000, month: 1, day: 2 }),
        person('d', { year: 2000, month: 1, day: 2 }),
        person('e', { year: 2000 }),
        person('f', { year: 2000, month: 1 }),
      ],
      parentages: [],
      partnerships: [
        {
          id: 'pair',
          personA: 'p1',
          personB: 'p2',
          children: ['e', 'd', 'a', 'b', 'c', 'f'],
          status: 'unknown',
        },
      ],
    }
    expect([...family.partnerships[0].children!].sort(childOrder(family, ['p1', 'p2']))).toEqual([
      'd',
      'c',
      'b',
      'f',
      'a',
      'e',
    ])
  })
  it('neemt de opgeslagen kinderenlijst als fallback, ook wanneer die afwijkt van de persoonsnummers', () => {
    const family = fixture()
    family.partnerships[0].children = ['50', '70', '90', '10', '20']
    expect(ordered(family)).toEqual(['90', '70', '10', '50', '20'])
    family.people.find((p) => p.id === '50')!.birth = { year: 2000, month: 2, day: 30 }
    expect(ordered(family)).toEqual(['90', '70', '10', '50', '20'])
  })
  it('gebruikt de lijst van dit gezin en vermengt geen lijsten van andere ouders', () => {
    const family = fixture()
    family.partnerships.unshift({
      id: '0',
      personA: 'other1',
      personB: 'other2',
      children: ['50', '20'],
      status: 'current',
    })
    expect(['50', '20'].sort(childOrder(family, ['p1', 'p2']))).toEqual(['20', '50'])
    expect(['20', '50'].sort(childOrder(family, ['other1', 'other2']))).toEqual(['50', '20'])
  })
  it('sorteert de echte kinderen en hun takken; de leeftijd of het ID van een aangetrouwde partner stuurt niet de volgorde', () => {
    const family = fixture()
    for (const layout of [layoutFamily(family), layoutBranchingFamily(family)]) {
      const x = (id: string) => layout.find((p) => p.id === id)!.x
      for (const [left, right] of [
        ['90', '70'],
        ['70', '10'],
        ['10', '20'],
        ['20', '50'],
        ['g1', 'g2'],
      ])
        expect(x(left)).toBeLessThan(x(right))
    }
  })
  it('gebruikt dezelfde volgorde in de gezinsfocus vanuit beide ouders', () => {
    const family = fixture()
    const first = familyFocusOptions(family, 'p1')[0],
      second = familyFocusOptions(family, 'p2')[0]
    expect(first).toEqual(second)
    expect(first.childIds).toEqual(['90', '70', '10', '20', '50'])
    const layout = familyFocusPlacements(layoutFamily(family), first)
    expect(
      layout
        .filter((p) => first.childIds.includes(p.id))
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((p) => p.id),
    ).toEqual(first.childIds)
  })
  it('houdt de invoer en opgeslagen lijst intact en blijft stabiel bij een andere laadvolgorde', () => {
    const family = fixture(),
      before = JSON.stringify(family)
    const positions = layoutFamily(family)
    ordered(family)
    familyFocusOptions(family, 'p1')
    expect(JSON.stringify(family)).toBe(before)
    expect(
      layoutFamily({
        people: [...family.people].reverse(),
        parentages: [...family.parentages].reverse(),
        partnerships: [...family.partnerships].reverse(),
      }),
    ).toEqual(positions)
    expect([...family.people.map((p) => p.id)].sort(childOrder(family, ['p1', 'p2']))).toEqual(
      [...family.people.map((p) => p.id)].sort(childOrder(family, ['p2', 'p1'])),
    )
  })
})
