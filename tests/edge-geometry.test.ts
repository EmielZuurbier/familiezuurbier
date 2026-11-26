import { describe, expect, it } from 'vitest'
import {
  edgeDistances,
  gappedEdge,
  sampleEdge,
  segmentCrossing,
  taperedEdge,
  visibleEdgeSections,
} from '../src/lib/edge-geometry'

describe('Lijnen die van ouder naar kind dunner worden', () => {
  it('tekent de gevraagde begin- en eindbreedte, ook als de lijn omhoog groeit', () => {
    const points = [
      { x: 0, y: 100 },
      { x: 0, y: 0 },
    ]
    const outline = sampleEdge(taperedEdge(points, 4, 1))
    const first = outline.filter((p) => p.y === 100),
      last = outline.filter((p) => p.y === 0)
    expect(Math.max(...first.map((p) => p.x)) - Math.min(...first.map((p) => p.x))).toBe(4)
    expect(Math.max(...last.map((p) => p.x)) - Math.min(...last.map((p) => p.x))).toBe(1)
  })
  it('maakt echte onderbrekingen en laat de dikte na de kruising doorlopen', () => {
    const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      gaps = [{ from: 45, to: 55 }]
    const visible = visibleEdgeSections(points, gaps)
    expect(visible.map((s) => [s.from, s.to])).toEqual([
      [0, 45],
      [55, 100],
    ])
    expect(gappedEdge(points, gaps)).toBe('M 0 0 L 45 0 M 55 0 L 100 0')
    const outline = taperedEdge(points, 4, 1, gaps)
    expect((outline.match(/ Z/g) ?? []).length).toBe(2)
    expect(outline).toContain('55 1.175')
    expect(outline).not.toContain('NaN')
  })
  it('voegt overlappende onderbrekingen samen zonder de uiteinden te verplaatsen', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
    ]
    const sections = visibleEdgeSections(points, [
      { from: 50, to: 65 },
      { from: 40, to: 55 },
    ])
    expect(sections.map((s) => s.points)).toEqual([
      [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
      ],
      [
        { x: 65, y: 0 },
        { x: 100, y: 0 },
      ],
    ])
  })
  it('ondersteunt bochten en de bestaande H/V-paden van de gezinsfocus', () => {
    const points = sampleEdge('M 0 0 V 20 H 40 Q 50 20 50 30 C 50 40 70 40 70 50')
    expect(points[0]).toEqual({ x: 0, y: 0 })
    expect(points.at(-1)).toEqual({ x: 70, y: 50 })
    expect(edgeDistances(points).at(-1)).toBeGreaterThan(100)
    expect(taperedEdge(points)).not.toMatch(/NaN|Infinity/)
    expect(taperedEdge([])).toBe('')
    expect(taperedEdge([{ x: 1, y: 2 }])).toBe('')
  })
  it('onderscheidt een kruising van evenwijdige lijnen', () => {
    expect(
      segmentCrossing({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 10, y: 0 }, { x: 0, y: 10 }),
    ).toEqual({ t: 0.5, u: 0.5 })
    expect(
      segmentCrossing({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 }),
    ).toBeNull()
  })
})
