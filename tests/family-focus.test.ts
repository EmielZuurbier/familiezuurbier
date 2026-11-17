import { describe, it, expect } from 'vitest'
import {
  familyFocusOptions,
  familyFocusPlacements,
  familyFocusViewport,
  familyFocusParentagePaths,
} from '../src/lib/family-focus'
import { demoFamily } from '../src/lib/demo'
import { CARD_HEIGHT, CARD_WIDTH, layoutFamily } from '../src/lib/layout'
import type { Family, Person } from '../src/lib/types'

const person = (id: string): Person => ({
  id,
  name: `Fictief ${id}`,
  birth: {},
  death: {},
  lifeStatus: 'unknown',
})
describe('Gezin in focus', () => {
  it('biedt vanuit beide partners hetzelfde gezin met alleen hun directe kinderen', () => {
    const a = familyFocusOptions(demoFamily, '7'),
      b = familyFocusOptions(demoFamily, '8')
    expect(a).toEqual(b)
    expect(a[0].parentIds).toEqual(['7', '8'])
    expect(a[0].childIds).toEqual(['13', '14'])
  })
  it('houdt verschillende partnerschappen en afzonderlijk ouderschap uit elkaar', () => {
    const family: Family = {
      people: ['a', 'b', 'c', 'd', 'x', 'y', 'z', 'w'].map(person),
      partnerships: [
        { id: 'ab', personA: 'a', personB: 'b', children: ['x'], status: 'ended' },
        { id: 'ac', personA: 'a', personB: 'c', children: ['y'], status: 'current' },
      ],
      parentages: [
        { id: 'z', parent: 'a', child: 'z' },
        { id: 'w1', parent: 'a', child: 'w' },
        { id: 'w2', parent: 'd', child: 'w' },
      ],
    }
    const groups = familyFocusOptions(family, 'a')
    expect(groups.map((group) => [group.parentIds, group.childIds])).toEqual([
      [['a'], ['z']],
      [['a', 'b'], ['x']],
      [['a', 'c'], ['y']],
      [['a', 'd'], ['w']],
    ])
    expect(familyFocusOptions(family, 'b')[0].childIds).toEqual(['x'])
  })
  it('vindt voor een kind het gezin van de ouders en de vastgelegde broers en zussen', () => {
    const options = familyFocusOptions(demoFamily, '13')
    expect(options[0]).toMatchObject({
      parentIds: ['7', '8'],
      childIds: ['13', '14'],
      origin: true,
    })
  })
  it('verzint geen familie voor een onbekende of ongekoppelde persoon en negeert kapotte verwijzingen', () => {
    const family: Family = {
      people: [person('a')],
      partnerships: [{ id: 'x', personA: 'a', personB: 'missing', status: 'unknown' }],
      parentages: [{ id: 'bad', parent: 'missing', child: 'a' }],
    }
    expect(familyFocusOptions(family, 'missing')).toEqual([])
    expect(familyFocusOptions(family, 'a')).toEqual([])
  })
  it('is onafhankelijk van invoervolgorde en laat de familiegegevens intact', () => {
    const original = JSON.stringify(demoFamily)
    const reversed = {
      people: [...demoFamily.people].reverse(),
      partnerships: [...demoFamily.partnerships].reverse(),
      parentages: [...demoFamily.parentages].reverse(),
    }
    expect(familyFocusOptions(reversed, '7')).toEqual(familyFocusOptions(demoFamily, '7'))
    expect(JSON.stringify(demoFamily)).toBe(original)
  })
  it('zet het gezin compact neer zonder contextpersonen of bronposities te verplaatsen', () => {
    const base = layoutFamily(demoFamily),
      before = JSON.stringify(base)
    const group = familyFocusOptions(demoFamily, '7')[0]
    const placements = familyFocusPlacements(base, group)
    const ids = new Set([...group.parentIds, ...group.childIds])
    expect(placements.filter((p) => !ids.has(p.id))).toEqual(base.filter((p) => !ids.has(p.id)))
    const parents = placements.filter((p) => group.parentIds.includes(p.id)),
      children = placements.filter((p) => group.childIds.includes(p.id))
    expect(children.every((child) => child.y > parents[0].y + CARD_HEIGHT)).toBe(true)
    expect(children[1].x - children[0].x).toBeGreaterThan(CARD_WIDTH)
    expect(JSON.stringify(base)).toBe(before)
    expect(familyFocusPlacements(base, group, true).find((p) => p.id === '13')!.y).toBeLessThan(
      parents[0].y,
    )
  })
  it('houdt alle gezinskaarten binnen het beeld, vrij van banner en minimap, op desktop en mobiel', () => {
    const group = familyFocusOptions(demoFamily, '7')[0],
      positions = familyFocusPlacements(layoutFamily(demoFamily), group)
    for (const size of [
      { width: 1000, height: 650 },
      { width: 390, height: 550 },
    ]) {
      const viewport = familyFocusViewport(positions, group, size)
      for (const p of positions.filter((p) =>
        [...group.parentIds, ...group.childIds].includes(p.id),
      )) {
        expect(p.x * viewport.zoom + viewport.x).toBeGreaterThanOrEqual(23)
        expect((p.x + CARD_WIDTH) * viewport.zoom + viewport.x).toBeLessThanOrEqual(size.width - 23)
        expect(p.y * viewport.zoom + viewport.y).toBeGreaterThanOrEqual(93)
        expect((p.y + CARD_HEIGHT) * viewport.zoom + viewport.y).toBeLessThanOrEqual(
          size.height - 155,
        )
      }
    }
  })
  it('laat ook een groot gezin volledig in het mobiele focusbeeld passen', () => {
    const children = Array.from({ length: 12 }, (_, i) => `kind-${i}`)
    const family: Family = {
      people: ['a', 'b', ...children].map(person),
      partnerships: [{ id: 'ab', personA: 'a', personB: 'b', children, status: 'current' }],
      parentages: children.flatMap((child) =>
        ['a', 'b'].map((parent) => ({ id: `${parent}:${child}`, parent, child })),
      ),
    }
    const group = familyFocusOptions(family, 'a')[0]
    const placements = familyFocusPlacements(layoutFamily(family), group)
    const viewport = familyFocusViewport(placements, group, { width: 390, height: 550 })
    expect(viewport.zoom).toBeGreaterThan(0.3)
    for (const p of placements) {
      expect(p.x * viewport.zoom + viewport.x).toBeGreaterThanOrEqual(23)
      expect((p.x + CARD_WIDTH) * viewport.zoom + viewport.x).toBeLessThanOrEqual(367)
      expect(p.y * viewport.zoom + viewport.y).toBeGreaterThanOrEqual(93)
      expect((p.y + CARD_HEIGHT) * viewport.zoom + viewport.y).toBeLessThanOrEqual(395)
    }
  })
  it('verdeelt grote gezinnen over rijen van maximaal vier, met vrije lijnen en behoud van kindvolgorde', () => {
    for (const count of [5, 8, 9, 12, 25]) {
      const children = Array.from({ length: count }, (_, i) => `kind-${i}`)
      const family: Family = {
        people: ['a', 'b', ...children].map(person),
        partnerships: [{ id: 'ab', personA: 'a', personB: 'b', children, status: 'current' }],
        parentages: children.flatMap((child) =>
          ['a', 'b'].map((parent) => ({ id: `${parent}:${child}`, parent, child })),
        ),
      }
      const group = familyFocusOptions(family, 'a')[0],
        base = layoutFamily(family)
      for (const upwards of [false, true]) {
        const positions = familyFocusPlacements(base, group, upwards)
        const ordered = positions
          .filter((p) => children.includes(p.id))
          .sort((a, b) => (upwards ? b.y - a.y : a.y - b.y) || a.x - b.x)
        expect(ordered.map((p) => p.id)).toEqual(children)
        expect(new Set(ordered.map((p) => p.y)).size).toBe(Math.ceil(count / 4))
        for (const y of new Set(ordered.map((p) => p.y)))
          expect(ordered.filter((p) => p.y === y).length).toBeLessThanOrEqual(4)
        const paths = familyFocusParentagePaths(family, positions, group, upwards)
        expect(paths.size).toBe(count * 2)
        for (const path of paths.values()) {
          let x = 0,
            y = 0
          for (const [, command, first, second] of path.matchAll(
            /([MVH]) ([-\d.e+]+)(?: ([-\d.e+]+))?/g,
          )) {
            const nextX = command === 'V' ? x : Number(first)
            const nextY = command === 'H' ? y : Number(command === 'M' ? second : first)
            if (command !== 'M')
              for (const card of positions) {
                const crosses =
                  x === nextX
                    ? x > card.x &&
                      x < card.x + CARD_WIDTH &&
                      Math.max(y, nextY) > card.y &&
                      Math.min(y, nextY) < card.y + CARD_HEIGHT
                    : y > card.y &&
                      y < card.y + CARD_HEIGHT &&
                      Math.max(x, nextX) > card.x &&
                      Math.min(x, nextX) < card.x + CARD_WIDTH
                expect(crosses).toBe(false)
              }
            x = nextX
            y = nextY
          }
        }
        for (const size of [
          { width: 1000, height: 650 },
          { width: 390, height: 550 },
        ]) {
          const view = familyFocusViewport(positions, group, size)
          for (const p of positions) {
            expect(p.x * view.zoom + view.x).toBeGreaterThanOrEqual(23)
            expect((p.x + CARD_WIDTH) * view.zoom + view.x).toBeLessThanOrEqual(size.width - 23)
            expect(p.y * view.zoom + view.y).toBeGreaterThanOrEqual(93)
            expect((p.y + CARD_HEIGHT) * view.zoom + view.y).toBeLessThanOrEqual(size.height - 155)
          }
        }
      }
    }
  })
})
