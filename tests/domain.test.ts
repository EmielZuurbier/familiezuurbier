import { describe, expect, it } from 'vitest'
import { dateError, dateOrderError, age, formatDate, years } from '../src/lib/dates'
import { demoFamily } from '../src/lib/demo'
import { layoutFamily, CARD_WIDTH, CARD_HEIGHT } from '../src/lib/layout'
import { parentageError, relationKey } from '../src/lib/relations'
import { panViewport, constrainViewport, type PanSample, type PanAnchor } from '../src/lib/pan'
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
describe('muis verkent tegengesteld en bereikt de uitersten', () => {
  const bounds = { x: -1600, y: 0, width: 3200, height: 2400 },
    size = { width: 1000, height: 700 }
  const view = { x: 500, y: -700, zoom: 1 }
  const sample: PanSample = {
    point: { x: 500, y: 350 },
    pointerType: 'mouse',
    buttons: 0,
    enabled: true,
    exempt: false,
    now: 1000,
    wheelUntil: 0,
  }
  const anchor = () => panViewport(null, sample, view, bounds, size, 0.5).anchor!
  const move = (x: number, y: number, a: PanAnchor = anchor()) =>
    panViewport(a, { ...sample, point: { x, y } }, view, bounds, size, 0.5)
  it('schuift het hele vlak links/rechts/omhoog/omlaag tegengesteld aan de muis, ook in het midden', () => {
    expect(move(520, 350).viewport!.x).toBeLessThan(view.x)
    expect(move(480, 350).viewport!.x).toBeGreaterThan(view.x)
    expect(move(500, 370).viewport!.y).toBeLessThan(view.y)
    expect(move(500, 330).viewport!.y).toBeGreaterThan(view.y)
  })
  it('toont de volledige buitenste kaarten met witruimte, ruim voor de muisrand, bij elke snelheid en zoom', () => {
    for (const speed of [0.3, 0.5, 0.8])
      for (const zoom of [0.65, 1, 1.65]) {
        const current = constrainViewport({ ...view, zoom }, bounds, size)
        const a = panViewport(null, sample, current, bounds, size, speed).anchor!
        const corner = (x: number, y: number) =>
          panViewport(a, { ...sample, point: { x, y } }, current, bounds, size, speed).viewport!
        const leftBottom = corner(140, size.height - 140),
          rightTop = corner(size.width - 140, 140)
        expect(bounds.x * zoom + leftBottom.x).toBeCloseTo(112)
        expect((bounds.x + bounds.width) * zoom + rightTop.x).toBeCloseTo(size.width - 112)
        expect(bounds.y * zoom + rightTop.y).toBeCloseTo(112)
        expect((bounds.y + bounds.height) * zoom + leftBottom.y).toBeCloseTo(size.height - 112)
        expect(corner(0, size.height)).toEqual(leftBottom)
        expect(corner(size.width, 0)).toEqual(rightTop)
      }
  })
  it('springt niet bij binnenkomen of na zoekfocus/zoomen en beweegt niet bij stilstand', () => {
    const first = panViewport(null, sample, view, bounds, size, 0.5)
    expect(first.viewport).toBeNull()
    expect(panViewport(first.anchor, sample, view, bounds, size, 0.5).viewport).toBeNull()
    const changed = move(520, 360)
    expect(
      panViewport(
        changed.anchor,
        { ...sample, point: { x: 520, y: 360 } },
        changed.viewport!,
        bounds,
        size,
        0.5,
      ).viewport,
    ).toBeNull()
    expect(
      panViewport(changed.anchor, sample, { ...view, zoom: 1.5 }, bounds, size, 0.5).viewport,
    ).toBeNull()
    expect(
      panViewport(changed.anchor, sample, view, bounds, { ...size, width: 600 }, 0.5).viewport,
    ).toBeNull()
  })
  it('laat touch, ingedrukte muisknoppen, pauze, menu en trackpad met rust', () => {
    for (const patch of [
      { pointerType: 'touch' },
      { pointerType: 'pen' },
      { buttons: 1 },
      { enabled: false },
      { exempt: true },
      { wheelUntil: 1200 },
    ]) {
      expect(panViewport(anchor(), { ...sample, ...patch }, view, bounds, size, 0.5)).toEqual({
        anchor: null,
        viewport: null,
      })
    }
  })
  it('houdt een volledig passend schema gecentreerd en begrenst zoekfocus', () => {
    const small = { x: -100, y: 0, width: 200, height: 100 }
    expect(constrainViewport({ x: 9999, y: -9999, zoom: 1 }, small, size)).toEqual({
      x: 500,
      y: 300,
      zoom: 1,
    })
    const focused = constrainViewport({ x: 9999, y: -9999, zoom: 1 }, bounds, size)
    expect(focused.x).toBe(1712)
    expect(focused.y).toBe(-1812)
  })
  it('springt niet naar het uiterste bij binnenkomen in de nieuwe buitenmarge', () => {
    for (const point of [
      { x: 5, y: 5 },
      { x: 995, y: 695 },
    ]) {
      const first = panViewport(null, { ...sample, point }, view, bounds, size, 0.5)
      expect(first.viewport).toBeNull()
      const next = panViewport(
        first.anchor,
        { ...sample, point: { x: point.x + 1, y: point.y + 1 } },
        view,
        bounds,
        size,
        0.5,
      )
      expect(Math.abs(next.viewport!.x - view.x)).toBeLessThan(30)
      expect(Math.abs(next.viewport!.y - view.y)).toBeLessThan(30)
    }
  })
  it('houdt op een klein scherm bruikbare ruimte aan zonder een passend schema te laten zweven', () => {
    const mobile = { width: 390, height: 550 }
    const current = constrainViewport(view, bounds, mobile)
    const anchor = panViewport(
      null,
      { ...sample, point: { x: 195, y: 275 } },
      current,
      bounds,
      mobile,
      0.5,
    ).anchor!
    const far = panViewport(
      anchor,
      { ...sample, point: { x: 292.5, y: 412.5 } },
      current,
      bounds,
      mobile,
      0.5,
    ).viewport!
    expect(bounds.x + bounds.width + far.x).toBeCloseTo(312)
    expect(bounds.y + bounds.height + far.y).toBeCloseTo(440)
    const small = { x: 0, y: 0, width: 212, height: 98 }
    expect(constrainViewport({ x: 999, y: 999, zoom: 1 }, small, mobile)).toEqual({
      x: 89,
      y: 226,
      zoom: 1,
    })
  })
})
