import { describe, it, expect } from 'vitest'
import {
  constrainViewport,
  navigationExtent,
  OFFSCREEN_MARGIN,
  MOUSE_AMPLITUDES,
  parallaxOffset,
  type PanSample,
} from '../src/lib/pan'
import { relatedPerson, nearestPerson, keyboardViewport } from '../src/lib/tree-keyboard'
import type { Family } from '../src/lib/types'
import type { Placement } from '../src/lib/layout'
const size = { width: 1000, height: 700 }
const sample: PanSample = {
  point: { x: 500, y: 350 },
  pointerType: 'mouse',
  buttons: 0,
  enabled: true,
  exempt: false,
  now: 1000,
  wheelUntil: 0,
}

describe('Subtiele muisbeweging', () => {
  it('verschuift enkele schermpixels, omkeerbaar zonder opgebouwde navigatie', () => {
    for (const amplitude of Object.values(MOUSE_AMPLITUDES)) {
      const start = parallaxOffset(null, sample, size, amplitude)
      expect(start.offset).toEqual({ x: 0, y: 0 })
      const move = (x: number, y: number) =>
        parallaxOffset(start.anchor, { ...sample, point: { x, y } }, size, amplitude)
      expect(move(750, 525).offset).toEqual({ x: -amplitude / 2, y: -amplitude / 2 })
      expect(move(500, 350).offset).toEqual({ x: -0, y: -0 })
      for (let pass = 0; pass < 20; pass++) {
        const next = move(1000, 700)
        expect(next.offset).toEqual({ x: -amplitude, y: -amplitude })
        expect(move(0, 0).offset).toEqual({ x: amplitude, y: amplitude })
      }
      expect(move(20000, -10000).offset).toEqual({ x: -amplitude, y: amplitude })
    }
  })
  it('blijft stilstaan en stopt bij selectie, touch, menu, scrollen of slepen', () => {
    const start = parallaxOffset(null, sample, size, 12)
    const moved = { ...sample, point: { x: 800, y: 500 } }
    expect(parallaxOffset(start.anchor, moved, size, 12)).toEqual(
      parallaxOffset(start.anchor, moved, size, 12),
    )
    for (const patch of [
      { enabled: false },
      { pointerType: 'touch' },
      { pointerType: 'pen' },
      { buttons: 1 },
      { exempt: true },
      { wheelUntil: 1100 },
    ])
      expect(parallaxOffset(start.anchor, { ...moved, ...patch }, size, 12)).toEqual({
        anchor: null,
        offset: { x: 0, y: 0 },
      })
    expect(parallaxOffset(start.anchor, moved, { width: 390, height: 550 }, 12).offset).toEqual({
      x: 0,
      y: 0,
    })
  })
})

describe('Vrij verplaatsen met een begrensde buitenruimte', () => {
  for (const bounds of [
    { x: -1600, y: -100, width: 3200, height: 2400 },
    { x: 0, y: 0, width: 212, height: 98 },
  ])
    for (const zoom of [0.16, 0.65, 1, 1.65]) {
      it(`stopt net buiten beeld bij breedte ${bounds.width} en zoom ${zoom}`, () => {
        const left = constrainViewport({ x: -1e6, y: -1e6, zoom }, bounds, size)
        const right = constrainViewport({ x: 1e6, y: 1e6, zoom }, bounds, size)
        expect(left.x + (bounds.x + bounds.width) * zoom).toBeCloseTo(-OFFSCREEN_MARGIN)
        expect(left.y + (bounds.y + bounds.height) * zoom).toBeCloseTo(-OFFSCREEN_MARGIN)
        expect(right.x + bounds.x * zoom).toBeCloseTo(size.width + OFFSCREEN_MARGIN)
        expect(right.y + bounds.y * zoom).toBeCloseTo(size.height + OFFSCREEN_MARGIN)
        const moved = { x: (left.x + right.x) / 3, y: (left.y + right.y) / 3, zoom }
        expect(constrainViewport(moved, bounds, size)).toEqual(moved)
        const [near, far] = navigationExtent(bounds, size, zoom)
        expect(-near[0] * zoom).toBeCloseTo(right.x)
        expect(size.width - far[0] * zoom).toBeCloseTo(left.x)
      })
    }
  it('geeft gelijke toetsenbordstappen in schermpixels, met grotere Shift-stappen', () => {
    for (const zoom of [0.16, 1, 1.65]) {
      const view = { x: 300, y: -400, zoom }
      expect(keyboardViewport(keyboardViewport(view, 'ArrowRight'), 'ArrowLeft')).toEqual(view)
      expect(keyboardViewport(keyboardViewport(view, 'ArrowUp'), 'ArrowDown')).toEqual(view)
      expect(Math.abs(keyboardViewport(view, 'ArrowRight', true).x - view.x)).toBeGreaterThan(
        Math.abs(keyboardViewport(view, 'ArrowRight').x - view.x),
      )
    }
  })
})

describe('Familiebanden met de pijltjestoetsen', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'outsider']
  const family: Family = {
    people: ids.map((id) => ({ id, name: id, birth: {}, death: {}, lifeStatus: 'unknown' })),
    partnerships: [
      { id: 'ab', personA: 'a', personB: 'b', status: 'current', children: ['c', 'd', 'e', 'f'] },
    ],
    parentages: [{ id: 'half', parent: 'a', child: 'outsider' }],
  }
  const positions = (upward = false): Placement[] =>
    ids.map((id, index) => ({
      id,
      generation: index < 2 ? 0 : 1,
      x: index < 2 ? index * 250 : (index - 2) * 250,
      y: index < 2 ? 0 : upward ? -250 : 250,
    }))
  it('gaat naar een ouder of kind, ook wanneer de boom omhoog groeit', () => {
    for (const upward of [false, true]) {
      const points = positions(upward)
      expect(relatedPerson(family, points, 'c', 'ArrowUp')).toBe('a')
      expect(relatedPerson(family, points, 'a', 'ArrowDown')).toBe('c')
      expect(relatedPerson(family, points, 'a', 'ArrowUp')).toBeNull()
      expect(relatedPerson(family, points, 'c', 'ArrowDown')).toBeNull()
    }
  })
  it('loopt door partners, broers, zussen en halfbroers zonder onbeperkt rond te gaan', () => {
    const points = positions()
    expect(relatedPerson(family, points, 'a', 'ArrowRight')).toBe('b')
    expect(relatedPerson(family, points, 'b', 'ArrowLeft')).toBe('a')
    expect(relatedPerson(family, points, 'c', 'ArrowRight')).toBe('d')
    expect(relatedPerson(family, points, 'd', 'ArrowLeft')).toBe('c')
    expect(relatedPerson(family, points, 'f', 'ArrowRight')).toBe('outsider')
    expect(relatedPerson(family, points, 'outsider', 'ArrowRight')).toBeNull()
  })
  it('blijft binnen gezinsfocus en gaat bij een nieuwe rij logisch verder', () => {
    const points = positions().map((p) => (p.id === 'f' ? { ...p, x: 0, y: 500 } : p))
    const allowed = new Set(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(relatedPerson(family, points, 'e', 'ArrowRight', allowed, true)).toBe('f')
    expect(relatedPerson(family, points, 'f', 'ArrowLeft', allowed, true)).toBe('e')
    expect(relatedPerson(family, points, 'f', 'ArrowRight', allowed, true)).toBeNull()
    expect(relatedPerson(family, points, 'outsider', 'ArrowUp', allowed, true)).toBeNull()
    expect(nearestPerson(points, { x: 0, y: 0, zoom: 1 }, size, new Set(['a']))).toBe('a')
    expect(nearestPerson([], { x: 0, y: 0, zoom: 1 }, size)).toBeNull()
  })
})
