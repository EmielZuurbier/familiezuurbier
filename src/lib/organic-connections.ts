import { CARD_HEIGHT, CARD_WIDTH, type Placement } from './layout'
import type { Family } from './types'

type Point = { x: number; y: number }
const number = (n: number) => Math.round(n * 1000) / 1000
function roundedPath(points: Point[]) {
  const clean = points.filter((p, i) => !i || p.x !== points[i - 1].x || p.y !== points[i - 1].y)
  const turns = clean.filter(
    (p, i) =>
      !i ||
      i === clean.length - 1 ||
      !(
        (clean[i - 1].x === p.x && p.x === clean[i + 1].x) ||
        (clean[i - 1].y === p.y && p.y === clean[i + 1].y)
      ),
  )
  let path = `M ${number(turns[0].x)} ${number(turns[0].y)}`
  for (let i = 1; i < turns.length - 1; i++) {
    const a = turns[i - 1],
      b = turns[i],
      c = turns[i + 1]
    const before = Math.hypot(b.x - a.x, b.y - a.y),
      after = Math.hypot(c.x - b.x, c.y - b.y)
    const radius = Math.min(18, before / 2, after / 2)
    path +=
      ` L ${number(b.x - ((b.x - a.x) * radius) / before)} ${number(b.y - ((b.y - a.y) * radius) / before)}` +
      ` Q ${number(b.x)} ${number(b.y)} ${number(b.x + ((c.x - b.x) * radius) / after)} ${number(b.y + ((c.y - b.y) * radius) / after)}`
  }
  const end = turns.at(-1)!
  return `${path} L ${number(end.x)} ${number(end.y)}`
}

/** Keep expressive curves where there is room; route long links around cards
 * when the vertically folded family branches occupy their direct route. */
export function organicParentagePaths(
  family: Family,
  placements: Placement[],
): Map<string, string> {
  const byId = new Map(placements.map((p) => [p.id, p]))
  if (!placements.length) return new Map()
  const boxes = placements.map((p) => ({
    left: p.x - 12,
    right: p.x + CARD_WIDTH + 12,
    top: p.y - 12,
    bottom: p.y + CARD_HEIGHT + 12,
  }))
  const xs = [
    ...new Set(placements.flatMap((p) => [p.x - 18, p.x + CARD_WIDTH / 2, p.x + CARD_WIDTH + 18])),
  ].sort((a, b) => a - b)
  const ys = [...new Set(placements.flatMap((p) => [p.y - 18, p.y + CARD_HEIGHT + 18]))].sort(
    (a, b) => a - b,
  )
  const xIndex = new Map(xs.map((x, i) => [x, i])),
    yIndex = new Map(ys.map((y, i) => [y, i]))
  const free = new Map<string, boolean>(),
    columns = xs.length
  const point = (node: number): Point => ({
    x: xs[node % columns],
    y: ys[Math.floor(node / columns)],
  })
  const clear = (a: number, b: number) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`
    if (free.has(key)) return free.get(key)!
    const from = point(a),
      to = point(b)
    const valid = !boxes.some((box) =>
      from.x === to.x
        ? from.x > box.left &&
          from.x < box.right &&
          Math.max(from.y, to.y) > box.top &&
          Math.min(from.y, to.y) < box.bottom
        : from.y > box.top &&
          from.y < box.bottom &&
          Math.max(from.x, to.x) > box.left &&
          Math.min(from.x, to.x) < box.right,
    )
    free.set(key, valid)
    return valid
  }
  const route = (start: Point, end: Point): Point[] | null => {
    const source = yIndex.get(start.y)! * columns + xIndex.get(start.x)!
    const target = yIndex.get(end.y)! * columns + xIndex.get(end.x)!
    type Entry = { state: number; cost: number; priority: number }
    const heap: Entry[] = [],
      costs = new Map<number, number>(),
      previous = new Map<number, number>()
    const push = (entry: Entry) => {
      let index = heap.length
      heap.push(entry)
      while (index) {
        const parent = (index - 1) >> 1
        if (heap[parent].priority <= entry.priority) break
        heap[index] = heap[parent]
        index = parent
      }
      heap[index] = entry
    }
    const pop = () => {
      const first = heap[0],
        last = heap.pop()!
      if (heap.length) {
        let index = 0
        while (index * 2 + 1 < heap.length) {
          let child = index * 2 + 1
          if (child + 1 < heap.length && heap[child + 1].priority < heap[child].priority) child++
          if (heap[child].priority >= last.priority) break
          heap[index] = heap[child]
          index = child
        }
        heap[index] = last
      }
      return first
    }
    costs.set(source * 2, 0)
    push({ state: source * 2, cost: 0, priority: 0 })
    while (heap.length) {
      const current = pop(),
        node = Math.floor(current.state / 2)
      if (current.cost !== costs.get(current.state)) continue
      if (node === target) {
        const points: Point[] = []
        let state: number | undefined = current.state
        while (state !== undefined) {
          points.push(point(Math.floor(state / 2)))
          state = previous.get(state)
        }
        return points.reverse()
      }
      const col = node % columns,
        row = Math.floor(node / columns),
        from = point(node)
      const neighbors = [
        col > 0 ? node - 1 : -1,
        col + 1 < columns ? node + 1 : -1,
        row > yIndex.get(end.y)! ? node - columns : -1,
      ]
      for (const next of neighbors) {
        if (next < 0 || !clear(node, next)) continue
        const to = point(next),
          direction = to.x === from.x ? 0 : 1,
          state = next * 2 + direction
        const cost =
          current.cost +
          Math.abs(to.x - from.x) +
          Math.abs(to.y - from.y) +
          (current.state % 2 === direction ? 0 : 12)
        if (cost >= (costs.get(state) ?? Infinity)) continue
        const distance = Math.abs(to.x - end.x) + Math.abs(to.y - end.y)
        costs.set(state, cost)
        previous.set(state, current.state)
        push({ state, cost, priority: cost + distance * 1.001 })
      }
    }
    return null
  }
  const paths = new Map<string, string>()
  for (const r of family.parentages) {
    const parent = byId.get(r.parent),
      child = byId.get(r.child)
    if (!parent || !child) continue
    const sx = parent.x + CARD_WIDTH / 2,
      sy = parent.y,
      tx = child.x + CARD_WIDTH / 2,
      ty = child.y + CARD_HEIGHT
    const bend = Math.max(48, (sy - ty) * 0.4)
    const curve = `M ${sx} ${sy} C ${sx} ${sy - bend} ${tx} ${ty + bend} ${tx} ${ty}`
    const steps = Math.ceil((Math.abs(tx - sx) + Math.abs(ty - sy)) / 20)
    const obstacles = placements.filter((p) => p.id !== r.parent && p.id !== r.child)
    let blocked = false
    for (let i = 1; i < steps && !blocked; i++) {
      const t = i / steps,
        u = 1 - t
      const x = u * u * u * sx + 3 * u * u * t * sx + 3 * u * t * t * tx + t * t * t * tx
      const y =
        u * u * u * sy + 3 * u * u * t * (sy - bend) + 3 * u * t * t * (ty + bend) + t * t * t * ty
      blocked = obstacles.some(
        (p) =>
          x > p.x - 10 && x < p.x + CARD_WIDTH + 10 && y > p.y - 10 && y < p.y + CARD_HEIGHT + 10,
      )
    }
    const detour = blocked ? route({ x: sx, y: sy - 18 }, { x: tx, y: ty + 18 }) : null
    paths.set(r.id, detour ? roundedPath([{ x: sx, y: sy }, ...detour, { x: tx, y: ty }]) : curve)
  }
  return paths
}
