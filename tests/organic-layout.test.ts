import { describe, expect, it } from 'vitest'
import { demoFamily } from '../src/lib/demo'
import { CARD_HEIGHT, CARD_WIDTH, layoutFamily, layoutOrganicFamily } from '../src/lib/layout'
import {
  familyFocusOptions,
  familyFocusPlacements,
  familyFocusViewport,
} from '../src/lib/family-focus'
import { childOrder } from '../src/lib/child-order'
import type { Family } from '../src/lib/types'
import { placementBounds } from '../src/lib/focus'
import { organicParentagePaths } from '../src/lib/organic-connections'

function largeFamily(): Family {
  const family: Family = { people: [], parentages: [], partnerships: [] }
  const add = (id: string, year: number) => {
    family.people.push({
      id,
      name: `Fictief ${id}`,
      birth: { year },
      death: {},
      lifeStatus: 'unknown',
    })
    return id
  }
  const roots = [add('a', 1940), add('b', 1941)]
  family.partnerships.push({
    id: 'ab',
    personA: roots[0],
    personB: roots[1],
    children: [],
    status: 'current',
  })
  for (let i = 0; i < 12; i++) {
    const child = add(`kind-${i}`, 1960 + i),
      partner = add(`partner-${i}`, 1950 + i)
    family.partnerships[0].children!.push(child)
    for (const parent of roots) family.parentages.push({ id: `${parent}:${child}`, parent, child })
    const children = Array.from({ length: (i % 4) + 1 }, (_, j) =>
      add(`kleinkind-${i}-${j}`, 1985 + j),
    )
    family.partnerships.push({
      id: `paar-${i}`,
      personA: child,
      personB: partner,
      children,
      status: 'current',
    })
    for (const grandchild of children)
      for (const parent of [child, partner])
        family.parentages.push({ id: `${parent}:${grandchild}`, parent, child: grandchild })
  }
  return family
}

describe('Vrije boom', () => {
  it('leidt lange verbindingen rond kaarten in de tussenliggende takken', () => {
    const family = largeFamily(),
      positions = layoutOrganicFamily(family)
    const paths = organicParentagePaths(family, positions)
    expect(paths.size).toBe(family.parentages.length)
    expect([...paths.values()].some((path) => path.includes(' Q '))).toBe(true)
    for (const r of family.parentages) {
      let x = 0,
        y = 0
      for (const [, command, values] of paths.get(r.id)!.matchAll(/([MLQC])([^MLQC]+)/g)) {
        const numbers = values.trim().split(/\s+/).map(Number)
        if (command === 'M') {
          ;[x, y] = numbers
          continue
        }
        const [ex, ey] = numbers.slice(-2)
        const steps = Math.ceil((Math.abs(ex - x) + Math.abs(ey - y)) / 8) + 8
        for (let i = 1; i < steps; i++) {
          const t = i / steps,
            u = 1 - t
          const px =
            command === 'L'
              ? x + (ex - x) * t
              : command === 'Q'
                ? u * u * x + 2 * u * t * numbers[0] + t * t * ex
                : u * u * u * x +
                  3 * u * u * t * numbers[0] +
                  3 * u * t * t * numbers[2] +
                  t * t * t * ex
          const py =
            command === 'L'
              ? y + (ey - y) * t
              : command === 'Q'
                ? u * u * y + 2 * u * t * numbers[1] + t * t * ey
                : u * u * u * y +
                  3 * u * u * t * numbers[1] +
                  3 * u * t * t * numbers[3] +
                  t * t * t * ey
          for (const p of positions)
            if (p.id !== r.parent && p.id !== r.child)
              expect(
                px > p.x && px < p.x + CARD_WIDTH && py > p.y && py < p.y + CARD_HEIGHT,
                `${r.id} kruist ${p.id}`,
              ).toBe(false)
        }
        x = ex
        y = ey
      }
    }
  })
  it('groeit omhoog met zichtbaar verspringende takken en houdt kaarten vrij', () => {
    for (const family of [demoFamily, largeFamily()]) {
      const layout = layoutOrganicFamily(family),
        byId = new Map(layout.map((p) => [p.id, p]))
      expect(layout.map((p) => p.id).sort()).toEqual(family.people.map((p) => p.id).sort())
      expect(
        new Set(layout.filter((p) => p.generation === 1).map((p) => p.y)).size,
      ).toBeGreaterThan(1)
      for (const r of family.parentages)
        expect(byId.get(r.child)!.y + CARD_HEIGHT + 40).toBeLessThan(byId.get(r.parent)!.y)
      for (const pair of family.partnerships)
        expect(byId.get(pair.personA)!.y).toBe(byId.get(pair.personB)!.y)
      for (const a of layout)
        for (const b of layout)
          if (a.id !== b.id)
            expect(Math.abs(a.x - b.x) >= CARD_WIDTH || Math.abs(a.y - b.y) >= CARD_HEIGHT).toBe(
              true,
            )
      for (const pair of family.partnerships) {
        const children = [...(pair.children ?? [])].sort(
          childOrder(family, [pair.personA, pair.personB]),
        )
        for (let start = 0; start < children.length; start += 3) {
          const row = children.slice(start, start + 3).map((id) => byId.get(id)!)
          for (let i = 1; i < row.length; i++) expect(row[i - 1].x).toBeLessThan(row[i].x)
          if (start >= 3) {
            const previous = children.slice(start - 3, start).map((id) => byId.get(id)!)
            expect(Math.max(...row.map((p) => p.y + CARD_HEIGHT))).toBeLessThan(
              Math.min(...previous.map((p) => p.y)),
            )
          }
        }
      }
    }
  })
  it('maakt twaalf gezinnen werkelijk smaller door complete takken hoger te stapelen', () => {
    const family = largeFamily(),
      compact = layoutOrganicFamily(family)
    const before = placementBounds(layoutFamily(family)),
      after = placementBounds(compact)
    expect(after.width).toBeLessThan(before.width * 0.55)
    expect(after.height).toBeGreaterThan(before.height * 1.5)
    const byId = new Map(compact.map((p) => [p.id, p]))
    for (let i = 0; i < 12; i++) {
      const parent = byId.get(`kind-${i}`)!,
        partner = byId.get(`partner-${i}`)!
      for (const r of family.parentages.filter((r) => r.parent === parent.id)) {
        const child = byId.get(r.child)!
        expect(
          Math.abs(child.x + CARD_WIDTH / 2 - (parent.x + partner.x + CARD_WIDTH) / 2),
        ).toBeLessThan(650)
      }
    }
  })
  it('houdt ook gedeelde afstamming, losse ouders en onafhankelijke families vrij van botsingen', () => {
    const family = largeFamily()
    // A shared child joins parents in two different shelf branches.
    family.parentages.push({ id: 'shared', parent: 'kind-11', child: 'kleinkind-0-0' })
    for (let i = 0; i < 12; i++)
      family.people.push({
        id: `los-${i}`,
        name: 'Fictief',
        birth: {},
        death: {},
        lifeStatus: 'unknown',
      })
    const positions = layoutOrganicFamily(family),
      byId = new Map(positions.map((p) => [p.id, p]))
    for (const r of family.parentages)
      expect(byId.get(r.child)!.y + CARD_HEIGHT).toBeLessThan(byId.get(r.parent)!.y)
    for (const a of positions)
      for (const b of positions)
        if (a.id !== b.id)
          expect(Math.abs(a.x - b.x) >= CARD_WIDTH || Math.abs(a.y - b.y) >= CARD_HEIGHT).toBe(true)
  })
  it('is stabiel, laat invoer intact en verandert de bestaande indeling niet', () => {
    const family = largeFamily(),
      before = JSON.stringify(family),
      classic = layoutFamily(family)
    expect(
      layoutOrganicFamily({
        people: [...family.people].reverse(),
        partnerships: [...family.partnerships].reverse(),
        parentages: [...family.parentages].reverse(),
      }),
    ).toEqual(layoutOrganicFamily(family))
    expect(JSON.stringify(family)).toBe(before)
    expect(layoutFamily(family)).toEqual(classic)
    expect(layoutOrganicFamily({ people: [], parentages: [], partnerships: [] })).toEqual([])
  })
  it('ondersteunt gezinsfocus met vier kaarten per rij en een passende camera', () => {
    const family = largeFamily(),
      group = familyFocusOptions(family, 'a')[0]
    const placements = familyFocusPlacements(layoutOrganicFamily(family), group, true)
    const ids = new Set([...group.parentIds, ...group.childIds])
    const focused = placements.filter((p) => ids.has(p.id))
    const children = focused
      .filter((p) => group.childIds.includes(p.id))
      .sort((a, b) => b.y - a.y || a.x - b.x)
    expect(children.map((p) => p.id)).toEqual(group.childIds)
    for (const y of new Set(children.map((p) => p.y)))
      expect(children.filter((p) => p.y === y).length).toBeLessThanOrEqual(4)
    for (const size of [
      { width: 1000, height: 650 },
      { width: 390, height: 550 },
    ]) {
      const view = familyFocusViewport(placements, group, size)
      for (const p of focused) {
        expect(p.x * view.zoom + view.x).toBeGreaterThanOrEqual(23)
        expect((p.x + CARD_WIDTH) * view.zoom + view.x).toBeLessThanOrEqual(size.width - 23)
        expect(p.y * view.zoom + view.y).toBeGreaterThanOrEqual(93)
        expect((p.y + CARD_HEIGHT) * view.zoom + view.y).toBeLessThanOrEqual(size.height - 155)
      }
    }
  })
})
