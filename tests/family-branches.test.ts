import { describe, expect, it } from 'vitest'
import { layoutFamily, CARD_WIDTH, CARD_HEIGHT } from '../src/lib/layout'
import { parentageJunctions } from '../src/lib/connections'
import type { Family } from '../src/lib/types'

// Independent fictitious families with unequal numbers of descendants. No names
// or private records are needed to reproduce generation-wide centring errors.
export function branchingFixture(): Family {
  const family: Family = { people: [], parentages: [], partnerships: [] }
  const person = (id: string) => {
    family.people.push({ id, name: `Fictief ${id}`, birth: {}, death: {}, lifeStatus: 'unknown' })
    return id
  }
  const pair = (id: string) => {
    const a = person(`${id}-a`),
      b = person(`${id}-b`)
    family.partnerships.push({ id, personA: a, personB: b, status: 'current' })
    return [a, b]
  }
  const parents = pair('stam')
  for (let i = 0; i < 4; i++) {
    const couple = pair(`gezin-${i}`)
    for (const parent of parents)
      family.parentages.push({ id: `${parent}:${couple[0]}`, parent, child: couple[0] })
    for (let j = 0; j < i + 1; j++) {
      const child = person(`kind-${i}-${j}`)
      for (const parent of couple)
        family.parentages.push({ id: `${parent}:${child}`, parent, child })
    }
  }
  return family
}
describe('Eigen ruimte onder ieder ouderpaar', () => {
  it('centreert de kinderen onder hun eigen ouderpaar, ook bij ongelijke gezinsgroottes', () => {
    const family = branchingFixture(),
      layout = layoutFamily(family)
    for (const pair of family.partnerships.filter((p) => p.id !== 'stam')) {
      const parents = [pair.personA, pair.personB].map((id) => layout.find((p) => p.id === id)!)
      const children = family.parentages
        .filter((r) => r.parent === pair.personA)
        .map((r) => layout.find((p) => p.id === r.child)!)
      const center =
        (Math.min(...children.map((p) => p.x)) +
          Math.max(...children.map((p) => p.x + CARD_WIDTH))) /
        2
      const parentCenter = (parents[0].x + parents[1].x + CARD_WIDTH) / 2
      expect(center).toBeCloseTo(parentCenter)
      expect(children.every((child) => child.y > parents[0].y + CARD_HEIGHT)).toBe(true)
    }
  })
  it('houdt de kindergroepen van verschillende gezinnen uit elkaar', () => {
    const family = branchingFixture(),
      layout = layoutFamily(family)
    const spans = family.partnerships
      .filter((p) => p.id !== 'stam')
      .map((pair) => {
        const children = family.parentages
          .filter((r) => r.parent === pair.personA)
          .map((r) => layout.find((p) => p.id === r.child)!)
        return {
          min: Math.min(...children.map((p) => p.x)),
          max: Math.max(...children.map((p) => p.x + CARD_WIDTH)),
        }
      })
      .sort((a, b) => a.min - b.min)
    for (let i = 1; i < spans.length; i++) expect(spans[i].min).toBeGreaterThan(spans[i - 1].max)
  })
  it('plaatst verbindingspunten in de ruimte tussen ouders en kinderen, apart per gezin', () => {
    const family = branchingFixture(),
      layout = layoutFamily(family),
      byId = new Map(layout.map((p) => [p.id, p])),
      junctions = parentageJunctions(family, layout)
    for (const r of family.parentages) {
      const junction = junctions.get(r.id)!
      expect(junction.y).toBeGreaterThan(byId.get(r.parent)!.y + CARD_HEIGHT)
      expect(junction.y).toBeLessThan(byId.get(r.child)!.y)
    }
    const centers = family.partnerships
      .filter((p) => p.id !== 'stam')
      .map((pair) => junctions.get(family.parentages.find((r) => r.parent === pair.personA)!.id)!.x)
    expect(new Set(centers).size).toBe(4)
  })
  it('verplaatst geen personen of familiebanden door de invoervolgorde', () => {
    const family = branchingFixture(),
      before = JSON.stringify(family)
    const layout = layoutFamily(family)
    expect(
      layoutFamily({
        people: [...family.people].reverse(),
        parentages: [...family.parentages].reverse(),
        partnerships: [...family.partnerships].reverse(),
      }),
    ).toEqual(layout)
    expect(JSON.stringify(family)).toBe(before)
    for (const a of layout)
      for (const b of layout)
        if (a.id !== b.id)
          expect(Math.abs(a.x - b.x) >= CARD_WIDTH || Math.abs(a.y - b.y) >= CARD_HEIGHT).toBe(true)
  })
})
