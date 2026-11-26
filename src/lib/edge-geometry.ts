export type EdgePoint = { x: number; y: number }
export type EdgeGap = { from: number; to: number }
export const edgeNumber = (n: number) => Math.round(n * 1000) / 1000
export const pointKey = (p: EdgePoint) => `${edgeNumber(p.x)},${edgeNumber(p.y)}`
export const pointDistance = (a: EdgePoint, b: EdgePoint) => Math.hypot(b.x - a.x, b.y - a.y)
const lerp = (a: EdgePoint, b: EdgePoint, t: number): EdgePoint => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
})

export function simplifyPoints(points: EdgePoint[]) {
  const clean = points.filter((p, i) => !i || pointDistance(p, points[i - 1]) > 0.001)
  return clean.filter((p, i) => {
    if (!i || i === clean.length - 1) return true
    const a = clean[i - 1],
      b = clean[i + 1]
    return (
      Math.abs((p.x - a.x) * (b.y - p.y) - (p.y - a.y) * (b.x - p.x)) > 0.01 ||
      (p.x - a.x) * (b.x - p.x) + (p.y - a.y) * (b.y - p.y) < 0
    )
  })
}

export function roundedEdge(points: EdgePoint[]) {
  const turns = simplifyPoints(points)
  if (turns.length < 2) return ''
  let path = `M ${edgeNumber(turns[0].x)} ${edgeNumber(turns[0].y)}`
  for (let i = 1; i < turns.length - 1; i++) {
    const a = turns[i - 1],
      b = turns[i],
      c = turns[i + 1]
    const before = pointDistance(a, b),
      after = pointDistance(b, c)
    const radius = Math.min(24, before / 2, after / 2)
    const start = lerp(b, a, radius / before),
      end = lerp(b, c, radius / after)
    path += ` L ${edgeNumber(start.x)} ${edgeNumber(start.y)} Q ${edgeNumber(b.x)} ${edgeNumber(b.y)} ${edgeNumber(end.x)} ${edgeNumber(end.y)}`
  }
  const end = turns.at(-1)!
  return `${path} L ${edgeNumber(end.x)} ${edgeNumber(end.y)}`
}

/** The application's absolute M/L/H/V/Q/C paths, sampled only along curves.
 * Straight stretches need just their endpoints, even when they are very long. */
export function sampleEdge(path: string): EdgePoint[] {
  const points: EdgePoint[] = []
  let start: EdgePoint = { x: 0, y: 0 }
  for (const [, command, values] of path.matchAll(/([MLHVQC])([^MLHVQC]*)/g)) {
    const n = (values.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) ?? []).map(Number)
    const end =
      command === 'H'
        ? { x: n[0], y: start.y }
        : command === 'V'
          ? { x: start.x, y: n[0] }
          : { x: n.at(-2)!, y: n.at(-1)! }
    if (command === 'Q' || command === 'C') {
      const c1 = { x: n[0], y: n[1] },
        c2 = command === 'C' ? { x: n[2], y: n[3] } : c1
      const length = pointDistance(start, c1) + pointDistance(c1, c2) + pointDistance(c2, end)
      const steps = Math.max(6, Math.min(160, Math.ceil(length / 8)))
      for (let i = 1; i <= steps; i++) {
        const t = i / steps,
          u = 1 - t
        points.push(
          command === 'Q'
            ? {
                x: u * u * start.x + 2 * u * t * c1.x + t * t * end.x,
                y: u * u * start.y + 2 * u * t * c1.y + t * t * end.y,
              }
            : {
                x: u ** 3 * start.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t ** 3 * end.x,
                y: u ** 3 * start.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t ** 3 * end.y,
              },
        )
      }
    } else points.push(end)
    start = end
  }
  return points.filter((p, i) => !i || pointDistance(p, points[i - 1]) > 0.001)
}

export function edgeDistances(points: EdgePoint[]) {
  const distances = [0]
  for (let i = 1; i < points.length; i++)
    distances.push(distances[i - 1] + pointDistance(points[i - 1], points[i]))
  return distances
}

export function segmentCrossing(a: EdgePoint, b: EdgePoint, c: EdgePoint, d: EdgePoint) {
  const rx = b.x - a.x,
    ry = b.y - a.y,
    sx = d.x - c.x,
    sy = d.y - c.y
  const denominator = rx * sy - ry * sx
  if (Math.abs(denominator) < 0.00001) return null
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / denominator
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / denominator
  return t >= -0.00001 && t <= 1.00001 && u >= -0.00001 && u <= 1.00001
    ? { t: Math.max(0, Math.min(1, t)), u: Math.max(0, Math.min(1, u)) }
    : null
}

/** Cut by arc length, so a taper continues smoothly on both sides of a bridge. */
export function visibleEdgeSections(points: EdgePoint[], gaps: EdgeGap[] = []) {
  if (points.length < 2) return []
  const distances = edgeDistances(points),
    total = distances.at(-1)!
  const merged: EdgeGap[] = []
  for (const gap of [...gaps].sort((a, b) => a.from - b.from)) {
    const from = Math.max(0, gap.from),
      to = Math.min(total, gap.to)
    if (to <= from) continue
    const last = merged.at(-1)
    if (last && from <= last.to) last.to = Math.max(last.to, to)
    else merged.push({ from, to })
  }
  const ranges: EdgeGap[] = []
  let cursor = 0
  for (const gap of merged) {
    if (gap.from > cursor) ranges.push({ from: cursor, to: gap.from })
    cursor = gap.to
  }
  if (cursor < total) ranges.push({ from: cursor, to: total })
  const at = (distance: number) => {
    let i = 1
    while (i < distances.length - 1 && distances[i] < distance) i++
    return lerp(
      points[i - 1],
      points[i],
      (distance - distances[i - 1]) / (distances[i] - distances[i - 1]),
    )
  }
  return ranges.map(({ from, to }) => ({
    points: [
      at(from),
      ...points.filter((_, i) => distances[i] > from && distances[i] < to),
      at(to),
    ],
    from,
    to,
    total,
  }))
}

export function gappedEdge(points: EdgePoint[], gaps: EdgeGap[] = []) {
  return visibleEdgeSections(points, gaps)
    .map((section) =>
      section.points
        .map((p, i) => `${i ? 'L' : 'M'} ${edgeNumber(p.x)} ${edgeNumber(p.y)}`)
        .join(' '),
    )
    .join(' ')
}

export function taperedEdge(
  points: EdgePoint[],
  startWidth = 3.4,
  endWidth = 1.1,
  gaps: EdgeGap[] = [],
) {
  return visibleEdgeSections(points, gaps)
    .map((section) => {
      const distances = edgeDistances(section.points)
      const left: EdgePoint[] = [],
        right: EdgePoint[] = []
      section.points.forEach((p, i) => {
        const before = section.points[Math.max(0, i - 1)],
          after = section.points[Math.min(section.points.length - 1, i + 1)]
        const length = pointDistance(before, after) || 1
        const width =
          (startWidth + (endWidth - startWidth) * ((section.from + distances[i]) / section.total)) /
          2
        const nx = (-(after.y - before.y) / length) * width,
          ny = ((after.x - before.x) / length) * width
        left.push({ x: p.x + nx, y: p.y + ny })
        right.push({ x: p.x - nx, y: p.y - ny })
      })
      return (
        [...left, ...right.reverse()]
          .map((p, i) => `${i ? 'L' : 'M'} ${edgeNumber(p.x)} ${edgeNumber(p.y)}`)
          .join(' ') + ' Z'
      )
    })
    .join(' ')
}
