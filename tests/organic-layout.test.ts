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
import { organicConnections } from '../src/lib/organic-connections'

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
  it('houdt alle gezinstakken, partnerlijnen en uitwijkroutes buiten de kaarten', () => {
    const family = largeFamily(),
      positions = layoutOrganicFamily(family)
    const edges = organicConnections(family, positions)
    expect(new Set(edges.flatMap((e) => e.relationIds))).toEqual(
      new Set(family.parentages.map((r) => r.id)),
    )
    expect(edges.filter((e) => e.kind === 'partnership')).toHaveLength(family.partnerships.length)
    const collisions = new Set<string>()
    for (const edge of edges) {
      expect(edge.points.length).toBeGreaterThan(1)
      expect(edge.path).not.toMatch(/NaN|Infinity/)
      for (let i = 1; i < edge.points.length; i++) {
        const a = edge.points[i - 1],
          b = edge.points[i]
        const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3)
        for (let j = 0; j <= steps; j++) {
          const x = a.x + ((b.x - a.x) * j) / steps,
            y = a.y + ((b.y - a.y) * j) / steps
          for (const p of positions)
            if (
              x > p.x + 0.01 &&
              x < p.x + CARD_WIDTH - 0.01 &&
              y > p.y + 0.01 &&
              y < p.y + CARD_HEIGHT - 0.01
            )
              collisions.add(`${edge.id} kruist ${p.id}`)
        }
      }
    }
    expect([...collisions]).toEqual([])
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
  it('tekent één stam uit het partnerschap en bewaart losse ouder-kindrelaties', () => {
    const family = structuredClone(demoFamily)
    family.parentages.push({ id: 'losse-ouder', parent: '1', child: '16' })
    const positions = layoutOrganicFamily(family),
      byId = new Map(positions.map((p) => [p.id, p]))
    const edges = organicConnections(family, positions)
    expect(new Set(edges.flatMap((edge) => edge.relationIds))).toEqual(
      new Set(family.parentages.map((r) => r.id)),
    )
    const pair = family.partnerships[0],
      group = edges.filter((e) => e.kind === 'parentage' && e.group === `pair:${pair.id}`)
    const a = byId.get(pair.personA)!,
      b = byId.get(pair.personB)!
    const root = { x: (a.x + b.x + CARD_WIDTH) / 2, y: a.y + CARD_HEIGHT / 2 }
    expect(
      group.filter((e) => Math.hypot(e.points[0].x - root.x, e.points[0].y - root.y) < 0.01),
    ).toHaveLength(1)
    const loose = edges.filter((e) => e.relationIds.includes('losse-ouder'))
    expect(loose.length).toBeGreaterThan(0)
    expect(loose.every((e) => e.parentIds.length === 1 && e.parentIds[0] === '1')).toBe(true)
    for (const edge of edges)
      if (edge.kind === 'parentage') {
        expect(edge.startWidth).toBeGreaterThan(edge.endWidth)
        expect(edge.outline).toContain(' Z')
      }
  })
  it('blijft deterministisch bij gewijzigde invoervolgorde en houdt partnerlijnen even dik', () => {
    const positions = layoutOrganicFamily(demoFamily)
    const edges = organicConnections(demoFamily, positions)
    expect(
      organicConnections(
        {
          ...demoFamily,
          people: [...demoFamily.people].reverse(),
          parentages: [...demoFamily.parentages].reverse(),
          partnerships: [...demoFamily.partnerships].reverse(),
        },
        [...positions].reverse(),
      ),
    ).toEqual(edges)
    for (const edge of edges.filter((e) => e.kind === 'partnership'))
      expect(edge.startWidth).toBe(edge.endWidth)
    expect(organicConnections({ people: [], parentages: [], partnerships: [] }, [])).toEqual([])
  })
  it('houdt meerdere partnerschappen en een losse ouder afzonderlijk herkenbaar', () => {
    const family: Family = {
      people: ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({
        id,
        name: '',
        birth: {},
        death: {},
        lifeStatus: 'unknown',
      })),
      partnerships: [
        { id: 'ab', personA: 'a', personB: 'b', status: 'ended', children: ['d', 'e'] },
        { id: 'ac', personA: 'a', personB: 'c', status: 'current', children: ['f'] },
      ],
      parentages: [
        ['a', 'd'],
        ['b', 'd'],
        ['a', 'e'],
        ['b', 'e'],
        ['a', 'f'],
        ['c', 'f'],
        ['a', 'g'],
      ].map(([parent, child], i) => ({ id: String(i), parent, child })),
    }
    const positions = layoutOrganicFamily(family),
      edges = organicConnections(family, positions)
    expect(new Set(edges.flatMap((e) => e.relationIds))).toEqual(
      new Set(family.parentages.map((r) => r.id)),
    )
    expect(
      edges
        .filter((e) => e.group === 'pair:ab' && e.kind === 'parentage')
        .every((e) => e.parentIds.join(':') === 'a:b'),
    ).toBe(true)
    expect(
      edges
        .filter((e) => e.group === 'pair:ac' && e.kind === 'parentage')
        .every((e) => e.parentIds.join(':') === 'a:c'),
    ).toBe(true)
    expect(edges.find((e) => e.group === 'pair:ab' && e.kind === 'partnership')?.ended).toBe(true)
    expect(
      edges.filter((e) => e.childIds.includes('g')).every((e) => e.parentIds.join(':') === 'a'),
    ).toBe(true)
    for (const edge of edges)
      for (let i = 1; i < edge.points.length; i++) {
        const a = edge.points[i - 1],
          b = edge.points[i],
          steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3))
        for (let j = 0; j <= steps; j++)
          for (const card of positions) {
            const x = a.x + ((b.x - a.x) * j) / steps,
              y = a.y + ((b.y - a.y) * j) / steps
            expect(
              x > card.x + 0.01 &&
                x < card.x + CARD_WIDTH - 0.01 &&
                y > card.y + 0.01 &&
                y < card.y + CARD_HEIGHT - 0.01,
            ).toBe(false)
          }
      }
  })
  it('maakt bij een resterende kruising een echte onderbreking in de onderste lijn', () => {
    const family: Family = {
      people: ['a', 'b', 'c', 'd'].map((id) => ({
        id,
        name: '',
        birth: {},
        death: {},
        lifeStatus: 'unknown',
      })),
      partnerships: [],
      parentages: [
        { id: 'ac', parent: 'a', child: 'c' },
        { id: 'bd', parent: 'b', child: 'd' },
      ],
    }
    const edges = organicConnections(family, [
      { id: 'a', x: 0, y: 500, generation: 0 },
      { id: 'b', x: 600, y: 500, generation: 0 },
      { id: 'c', x: 600, y: 0, generation: 1 },
      { id: 'd', x: 0, y: 0, generation: 1 },
    ])
    const interrupted = edges.filter((e) => e.gaps.length)
    expect(interrupted.length).toBeGreaterThan(0)
    for (const edge of interrupted) {
      expect((edge.path.match(/M /g) ?? []).length).toBeGreaterThan(1)
      expect((edge.outline.match(/ Z/g) ?? []).length).toBeGreaterThan(1)
    }
  })
  it('ondersteunt gezinsfocus met vier kaarten per rij en een passende camera', () => {
    const family = largeFamily(),
      group = familyFocusOptions(family, 'a')[0]
    const placements = familyFocusPlacements(layoutOrganicFamily(family), group, true)
    const ids = new Set([...group.parentIds, ...group.childIds])
    const focused = placements.filter((p) => ids.has(p.id))
    const focusFamily: Family = {
      people: family.people.filter((p) => ids.has(p.id)),
      parentages: family.parentages.filter(
        (r) => group.parentIds.includes(r.parent) && group.childIds.includes(r.child),
      ),
      partnerships: family.partnerships.filter(
        (p) => group.parentIds.includes(p.personA) && group.parentIds.includes(p.personB),
      ),
    }
    const routes = organicConnections(focusFamily, focused)
    expect(new Set(routes.flatMap((r) => r.relationIds))).toEqual(
      new Set(focusFamily.parentages.map((r) => r.id)),
    )
    expect(routes.filter((r) => r.kind === 'partnership')).toHaveLength(1)
    for (const route of routes)
      for (const point of route.points)
        for (const card of focused)
          expect(
            point.x > card.x + 0.01 &&
              point.x < card.x + CARD_WIDTH - 0.01 &&
              point.y > card.y + 0.01 &&
              point.y < card.y + CARD_HEIGHT - 0.01,
          ).toBe(false)
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
