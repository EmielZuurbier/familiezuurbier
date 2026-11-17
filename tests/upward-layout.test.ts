import { describe, it, expect } from 'vitest'
import {
  layoutFamily,
  layoutBranchingFamily,
  CARD_WIDTH,
  CARD_HEIGHT,
  type Placement,
} from '../src/lib/layout'
import { stemPlacements, stemViewport } from '../src/lib/focus'
import {
  partnershipPath,
  partnershipDetour,
  parentageJunctions,
  parentagePath,
} from '../src/lib/connections'
import { demoFamily } from '../src/lib/demo'
import type { Family } from '../src/lib/types'
function assertLayout(family: Family) {
  const layout = layoutBranchingFamily(family),
    byId = new Map(layout.map((p) => [p.id, p]))
  expect(layout).toHaveLength(family.people.length)
  for (const link of family.parentages) {
    const parent = byId.get(link.parent)!,
      child = byId.get(link.child)!
    expect(parent.y).toBeGreaterThan(child.y + CARD_HEIGHT)
  }
  for (const a of layout)
    for (const b of layout)
      if (a.id !== b.id) {
        expect(Math.abs(a.x - b.x) >= CARD_WIDTH || Math.abs(a.y - b.y) >= CARD_HEIGHT).toBe(true)
      }
  return layout
}
const people = (...ids: string[]) =>
  ids.map((id) => ({
    id,
    name: `Voorbeeld ${id}`,
    birth: {},
    death: {},
    lifeStatus: 'unknown' as const,
  }))
describe('losse opwaartse voorvertoning', () => {
  it('houdt de bestaande live indeling intact terwijl de nieuwe ouders onder de kinderen staan', () => {
    const classic = layoutFamily(demoFamily),
      next = assertLayout(demoFamily)
    for (const link of demoFamily.parentages)
      expect(classic.find((p) => p.id === link.parent)!.y).toBeLessThan(
        classic.find((p) => p.id === link.child)!.y,
      )
    expect(next.filter((p) => p.generation === 0).every((p) => p.y === 0)).toBe(true)
    expect(new Set(next.filter((p) => p.generation === 2).map((p) => p.y)).size).toBeGreaterThan(1)
  })
  it('reserveert ruimte per familietak en houdt partners naast elkaar op dezelfde hoogte', () => {
    const layout = assertLayout(demoFamily),
      byId = new Map(layout.map((p) => [p.id, p]))
    for (const pair of demoFamily.partnerships)
      expect(byId.get(pair.personA)!.y).toBe(byId.get(pair.personB)!.y)
    expect(byId.get('13')!.x).toBeLessThan(byId.get('15')!.x)
    expect(byId.get('14')!.x).toBeLessThan(byId.get('15')!.x)
    expect(byId.get('15')!.x).toBeLessThan(byId.get('16')!.x)
  })
  it('is identiek bij omgekeerde invoervolgorde van personen en relaties', () => {
    expect(
      layoutBranchingFamily({
        ...demoFamily,
        people: [...demoFamily.people].reverse(),
        parentages: [...demoFamily.parentages].reverse(),
        partnerships: [...demoFamily.partnerships].reverse(),
      }),
    ).toEqual(layoutBranchingFamily(demoFamily))
  })
  it('verwerkt meerdere partners, onverbonden personen en ouderschap zonder partnerschap', () => {
    const data: Family = {
      people: people('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'),
      parentages: [
        { id: '1', parent: 'a', child: 'e' },
        { id: '2', parent: 'b', child: 'e' },
        { id: '3', parent: 'c', child: 'f' },
        { id: '4', parent: 'a', child: 'f' },
        { id: '5', parent: 'g', child: 'h' },
      ],
      partnerships: [
        { id: '1', personA: 'a', personB: 'b', status: 'unknown' },
        { id: '2', personA: 'a', personB: 'c', status: 'ended' },
        { id: '3', personA: 'a', personB: 'd', status: 'unknown' },
      ],
    }
    const layout = assertLayout(data)
    expect(layout.find((p) => p.id === 'g')!.generation).toBe(0)
    expect(
      new Set(layout.filter((p) => ['a', 'b', 'c', 'd'].includes(p.id)).map((p) => p.y)).size,
    ).toBe(1)
    const byId = new Map(layout.map((p) => [p.id, p]))
    expect(
      data.partnerships.some((p) => partnershipDetour(byId.get(p.personA)!, byId.get(p.personB)!)),
    ).toBe(true)
  })
  it('plaatst ook gedeelde voorouders en uiteenlopende oudergeneraties zonder overlap', () => {
    const data: Family = {
      people: people('a', 'b', 'c', 'd', 'e'),
      parentages: [
        { id: '1', parent: 'a', child: 'b' },
        { id: '2', parent: 'a', child: 'c' },
        { id: '3', parent: 'b', child: 'd' },
        { id: '4', parent: 'c', child: 'd' },
        { id: '5', parent: 'a', child: 'e' },
        { id: '6', parent: 'd', child: 'e' },
      ],
      partnerships: [],
    }
    assertLayout(data)
    expect(() =>
      layoutBranchingFamily({
        ...data,
        parentages: [...data.parentages, { id: 'bad', parent: 'e', child: 'a' }],
      }),
    ).toThrow('cirkel')
  })
  it('houdt losse componenten uit de stamfocus van de grootste familie', () => {
    const data: Family = {
      ...demoFamily,
      people: [...demoFamily.people, ...people('los-1', 'los-2')],
    }
    const layout = assertLayout(data),
      stem = stemPlacements(data, layout)
    expect(stem.map((p) => p.id)).toEqual(['1', '2'])
    for (const size of [
      { width: 994, height: 610 },
      { width: 390, height: 577 },
    ]) {
      const view = stemViewport(data, layout, size)
      for (const p of stem) {
        expect(p.x * view.zoom + view.x).toBeGreaterThanOrEqual(0)
        expect((p.x + CARD_WIDTH) * view.zoom + view.x).toBeLessThanOrEqual(size.width)
        expect(p.y * view.zoom + view.y).toBeGreaterThan(size.height * 0.5)
        expect((p.y + CARD_HEIGHT) * view.zoom + view.y).toBeLessThanOrEqual(size.height - 27)
      }
    }
  })
  it('leidt lange partnerlijnen onder de tussenliggende kaarten langs', () => {
    const point = (id: string, x: number): Placement => ({ id, x, y: 0, generation: 0 })
    expect(partnershipDetour(point('a', 0), point('b', 242))).toBe(false)
    expect(partnershipDetour(point('a', 0), point('c', 484))).toBe(true)
    expect(partnershipPath(212, 49, 484, 49, 0)).toContain('120')
    expect(partnershipPath(212, 49, 484, 49, 2)).toContain('146')
  })
  it('laat gedeelde ouders via hetzelfde getrouwe knooppunt naar hun kinderen uitwaaieren', () => {
    const placements = layoutBranchingFamily(demoFamily),
      junctions = parentageJunctions(demoFamily, placements)
    expect(junctions.size).toBe(demoFamily.parentages.length)
    for (const id of ['o1', 'o2', 'o3']) expect(junctions.get(id)).toEqual(junctions.get('o0'))
    const point = junctions.get('o0')!,
      parent = placements.find((p) => p.id === '1')!,
      child = placements.find((p) => p.id === '3')!
    expect(point.y).toBeLessThan(parent.y)
    expect(point.y).toBeGreaterThan(child.y + CARD_HEIGHT)
    expect(
      parentagePath(
        parent.x + CARD_WIDTH / 2,
        parent.y,
        child.x + CARD_WIDTH / 2,
        child.y + CARD_HEIGHT,
        point,
      ).match(/ C /g),
    ).toHaveLength(2)
  })
  it('verwerkt lege gegevens en dertig varianten met complexe vertakkingen', () => {
    expect(layoutBranchingFamily({ people: [], parentages: [], partnerships: [] })).toEqual([])
    for (let seed = 1; seed <= 30; seed++) {
      let value = seed
      const random = () => {
        value = (value * 1664525 + 1013904223) >>> 0
        return value / 2 ** 32
      }
      const ids = Array.from({ length: 36 }, (_, i) => String(i)),
        data: Family = { people: people(...ids), parentages: [], partnerships: [] }
      for (let child = 2; child < 36; child++)
        for (let k = 0; k < 2; k++) {
          const parent = Math.floor(random() * child)
          if (
            !data.parentages.some((p) => p.parent === String(parent) && p.child === String(child))
          )
            data.parentages.push({
              id: `${child}-${k}`,
              parent: String(parent),
              child: String(child),
            })
        }
      for (let i = 0; i < 9; i++) {
        const a = String(Math.floor(random() * 36)),
          b = String(Math.floor(random() * 36))
        if (a !== b)
          data.partnerships.push({ id: String(i), personA: a, personB: b, status: 'unknown' })
      }
      assertLayout(data)
    }
  })
})
