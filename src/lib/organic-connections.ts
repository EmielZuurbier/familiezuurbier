import { CARD_HEIGHT, CARD_WIDTH, type Placement } from './layout'
import { childOrder } from './child-order'
import type { Family } from './types'
import {
  edgeDistances,
  edgeNumber,
  gappedEdge,
  pointDistance,
  pointKey,
  roundedEdge,
  sampleEdge,
  segmentCrossing,
  simplifyPoints,
  taperedEdge,
  type EdgeGap,
  type EdgePoint,
} from './edge-geometry'

export type OrganicConnection = {
  id: string
  group: string
  kind: 'parentage' | 'partnership'
  source: string
  target: string
  parentIds: string[]
  childIds: string[]
  relationIds: string[]
  points: EdgePoint[]
  path: string
  outline: string
  gaps: EdgeGap[]
  startWidth: number
  endWidth: number
  ended?: boolean
}
type Segment = { a: EdgePoint; b: EdgePoint; owner: string }
const compare = (a: string, b: string) => a.localeCompare(b, 'nl', { numeric: true })
const portGap = 24

/** A small spatial index keeps route searches independent of total edge count. */
class Lines {
  buckets = new Map<string, Set<Segment>>()
  keys(a: EdgePoint, b: EdgePoint, padding = 10) {
    const keys: string[] = []
    for (
      let x = Math.floor((Math.min(a.x, b.x) - padding) / 96);
      x <= Math.floor((Math.max(a.x, b.x) + padding) / 96);
      x++
    )
      for (
        let y = Math.floor((Math.min(a.y, b.y) - padding) / 96);
        y <= Math.floor((Math.max(a.y, b.y) + padding) / 96);
        y++
      )
        keys.push(`${x}:${y}`)
    return keys
  }
  add(points: EdgePoint[], owner: string) {
    const inserted: Segment[] = []
    for (let i = 1; i < points.length; i++) {
      const line = { a: points[i - 1], b: points[i], owner }
      inserted.push(line)
      for (const key of this.keys(line.a, line.b)) {
        if (!this.buckets.has(key)) this.buckets.set(key, new Set())
        this.buckets.get(key)!.add(line)
      }
    }
    return inserted
  }
  near(a: EdgePoint, b: EdgePoint) {
    const found = new Set<Segment>()
    for (const key of this.keys(a, b))
      for (const line of this.buckets.get(key) ?? []) found.add(line)
    return found
  }
  cost(a: EdgePoint, b: EdgePoint, owner: string) {
    let cost = 0
    for (const line of this.near(a, b)) {
      if (line.owner === owner) continue
      if (segmentCrossing(a, b, line.a, line.b)) cost += 900
      // Penalize both exact overlap and close parallel travel. Separate lanes
      // remain preferable to repeatedly drawing on top of a previous family.
      const vertical = Math.abs(a.x - b.x) < 0.001 && Math.abs(line.a.x - line.b.x) < 0.001
      const horizontal = Math.abs(a.y - b.y) < 0.001 && Math.abs(line.a.y - line.b.y) < 0.001
      if (vertical || horizontal) {
        const gap = Math.abs(vertical ? a.x - line.a.x : a.y - line.a.y)
        const overlap = vertical
          ? Math.min(Math.max(a.y, b.y), Math.max(line.a.y, line.b.y)) -
            Math.max(Math.min(a.y, b.y), Math.min(line.a.y, line.b.y))
          : Math.min(Math.max(a.x, b.x), Math.max(line.a.x, line.b.x)) -
            Math.max(Math.min(a.x, b.x), Math.min(line.a.x, line.b.x))
        if (overlap > 0 && gap < 12) cost += overlap * (1 - gap / 12) * 18
      }
    }
    return cost
  }
}

class Router {
  xs: number[]
  ys: number[]
  xIndex: Map<number, number>
  yIndex: Map<number, number>
  horizontal: Uint8Array
  vertical: Uint8Array
  costs: Float64Array
  previous: Int32Array
  visited: Uint32Array
  penalties: Float64Array
  penaltyVersions: Uint32Array
  searchVersion = 0
  ownerVersion = 0
  owner = ''
  boxes: { left: number; right: number; top: number; bottom: number }[]
  constructor(
    placements: Placement[],
    anchors: EdgePoint[],
    readonly lines: Lines,
  ) {
    this.boxes = placements.map((p) => ({
      left: p.x - 8,
      right: p.x + CARD_WIDTH + 8,
      top: p.y - 8,
      bottom: p.y + CARD_HEIGHT + 8,
    }))
    this.xs = [
      ...new Set(
        [
          ...placements.flatMap((p) => [
            p.x - 40,
            p.x - portGap,
            p.x + CARD_WIDTH / 2,
            p.x + CARD_WIDTH + portGap,
            p.x + CARD_WIDTH + 40,
          ]),
          ...anchors.map((p) => p.x),
        ].map(edgeNumber),
      ),
    ].sort((a, b) => a - b)
    this.ys = [
      ...new Set(
        [
          ...placements.flatMap((p) => [
            p.y - 40,
            p.y - portGap,
            p.y + CARD_HEIGHT + portGap,
            p.y + CARD_HEIGHT + 40,
          ]),
          ...anchors.map((p) => p.y),
        ].map(edgeNumber),
      ),
    ].sort((a, b) => a - b)
    this.xIndex = new Map(this.xs.map((x, i) => [x, i]))
    this.yIndex = new Map(this.ys.map((y, i) => [y, i]))
    const columns = this.xs.length
    this.horizontal = new Uint8Array(columns * this.ys.length)
    this.vertical = new Uint8Array(columns * this.ys.length)
    this.costs = new Float64Array(columns * this.ys.length * 3)
    this.previous = new Int32Array(this.costs.length)
    this.visited = new Uint32Array(this.costs.length)
    this.penalties = new Float64Array(columns * this.ys.length * 2)
    this.penaltyVersions = new Uint32Array(this.penalties.length)
    // Mark blocked grid edges once instead of testing every card on each step.
    for (const box of this.boxes) {
      for (let row = 0; row < this.ys.length; row++) {
        const y = this.ys[row]
        if (y > box.bottom || (this.ys[row + 1] ?? y) < box.top) continue
        for (let col = 0; col < columns; col++) {
          const x = this.xs[col],
            node = row * columns + col
          if (x > box.right || (this.xs[col + 1] ?? x) < box.left) continue
          if (y > box.top && y < box.bottom && this.xs[col + 1] > box.left && x < box.right)
            this.horizontal[node] = 1
          if (x > box.left && x < box.right && this.ys[row + 1] > box.top && y < box.bottom)
            this.vertical[node] = 1
        }
      }
    }
  }
  node(p: EdgePoint) {
    return this.yIndex.get(edgeNumber(p.y))! * this.xs.length + this.xIndex.get(edgeNumber(p.x))!
  }
  point(node: number): EdgePoint {
    return { x: this.xs[node % this.xs.length], y: this.ys[Math.floor(node / this.xs.length)] }
  }
  clear(a: number, b: number) {
    return (Math.abs(a - b) === 1 ? this.horizontal : this.vertical)[Math.min(a, b)] === 0
  }
  freePoint(p: EdgePoint) {
    return !this.boxes.some((b) => p.x > b.left && p.x < b.right && p.y > b.top && p.y < b.bottom)
  }
  route(starts: Iterable<number>, end: EdgePoint, owner: string, upward = false): number[] | null {
    const target = this.node(end),
      columns = this.xs.length
    type Entry = { state: number; cost: number; priority: number }
    const heap: Entry[] = []
    const version = ++this.searchVersion
    if (owner !== this.owner) {
      this.owner = owner
      this.ownerVersion++
    }
    const costAt = (state: number) =>
      this.visited[state] === version ? this.costs[state] : Infinity
    const push = (entry: Entry) => {
      let i = heap.length
      heap.push(entry)
      while (i) {
        const parent = (i - 1) >> 1
        if (heap[parent].priority <= entry.priority) break
        heap[i] = heap[parent]
        i = parent
      }
      heap[i] = entry
    }
    const pop = () => {
      const first = heap[0],
        last = heap.pop()!
      if (heap.length) {
        let i = 0
        while (i * 2 + 1 < heap.length) {
          let child = i * 2 + 1
          if (child + 1 < heap.length && heap[child + 1].priority < heap[child].priority) child++
          if (heap[child].priority >= last.priority) break
          heap[i] = heap[child]
          i = child
        }
        heap[i] = last
      }
      return first
    }
    for (const node of starts) {
      const p = this.point(node)
      if (upward && p.y < end.y) continue
      this.costs[node * 3] = 0
      this.visited[node * 3] = version
      this.previous[node * 3] = -1
      push({
        state: node * 3,
        cost: 0,
        priority: (Math.abs(p.x - end.x) + Math.abs(p.y - end.y)) * 1.2,
      })
    }
    while (heap.length) {
      const current = pop(),
        node = Math.floor(current.state / 3)
      if (costAt(current.state) !== current.cost) continue
      if (node === target) {
        const route: number[] = []
        let state = current.state
        while (state !== -1) {
          route.push(Math.floor(state / 3))
          state = this.previous[state]
        }
        return route.reverse()
      }
      const col = node % columns,
        row = Math.floor(node / columns),
        from = this.point(node)
      const neighbors = [
        col ? node - 1 : -1,
        col + 1 < columns ? node + 1 : -1,
        row ? node - columns : -1,
        !upward && row + 1 < this.ys.length ? node + columns : -1,
      ]
      for (const next of neighbors) {
        if (next < 0 || !this.clear(node, next)) continue
        const to = this.point(next)
        if (upward && to.y < end.y) continue
        const direction = from.x === to.x ? 2 : 1,
          state = next * 3 + direction
        const key = Math.min(node, next) * 2 + (direction === 2 ? 1 : 0)
        if (this.penaltyVersions[key] !== this.ownerVersion) {
          this.penaltyVersions[key] = this.ownerVersion
          this.penalties[key] = this.lines.cost(from, to, owner)
        }
        const cost =
          current.cost +
          Math.abs(to.x - from.x) +
          Math.abs(to.y - from.y) +
          (current.state % 3 && current.state % 3 !== direction ? 20 : 0) +
          this.penalties[key]
        if (cost >= costAt(state)) continue
        this.costs[state] = cost
        this.visited[state] = version
        this.previous[state] = current.state
        push({
          state,
          cost,
          priority: cost + (Math.abs(to.x - end.x) + Math.abs(to.y - end.y)) * 1.2,
        })
      }
    }
    return null
  }
}

type Group = {
  id: string
  parentIds: string[]
  children: Map<string, string[]>
  root: EdgePoint
  exit: EdgePoint
  hub: EdgePoint
}
const connection = (
  id: string,
  group: string,
  source: string,
  target: string,
  points: EdgePoint[],
  kind: OrganicConnection['kind'],
): OrganicConnection => ({
  id,
  group,
  source,
  target,
  points,
  kind,
  parentIds: [],
  childIds: [],
  relationIds: [],
  path: '',
  outline: '',
  gaps: [],
  startWidth: kind === 'parentage' ? 3.4 : 1.8,
  endWidth: kind === 'parentage' ? 1.1 : 1.8,
})

/** Route the complete drawing together. Only genuine co-parent pairs share a
 * trunk; unrelated families, single parents and extra recorded parents do not. */
export function organicConnections(family: Family, placements: Placement[]): OrganicConnection[] {
  if (!placements.length) return []
  const byId = new Map(placements.map((p) => [p.id, p]))
  const lines = new Lines(),
    connections: OrganicConnection[] = []
  const pairs = [...family.partnerships]
    .filter((p) => byId.has(p.personA) && byId.has(p.personB))
    .sort((a, b) => compare(a.id, b.id))
  const partnerPorts = pairs.flatMap((pair) => {
    const [a, b] = [byId.get(pair.personA)!, byId.get(pair.personB)!].sort(
      (a, b) => a.x - b.x || compare(a.id, b.id),
    )
    return [
      { x: a.x + CARD_WIDTH + 12, y: a.y + CARD_HEIGHT / 2 },
      { x: b.x - 12, y: b.y + CARD_HEIGHT / 2 },
    ]
  })
  const partnerRouter = new Router(placements, partnerPorts, lines)
  const pairRoots = new Map<string, EdgePoint>()
  pairs.forEach((pair, i) => {
    const [a, b] = [byId.get(pair.personA)!, byId.get(pair.personB)!].sort(
      (a, b) => a.x - b.x || compare(a.id, b.id),
    )
    const start = { x: a.x + CARD_WIDTH, y: a.y + CARD_HEIGHT / 2 },
      end = { x: b.x, y: b.y + CARD_HEIGHT / 2 }
    const direct = a.y === b.y && b.x - start.x <= 40
    const nodes = direct
      ? null
      : partnerRouter.route(
          [partnerRouter.node(partnerPorts[i * 2])],
          partnerPorts[i * 2 + 1],
          `pair:${pair.id}`,
        )
    if (!direct && !nodes) throw new Error('Er is geen vrije route voor een partnerschap gevonden.')
    const points = simplifyPoints(
      direct ? [start, end] : [start, ...nodes!.map((n) => partnerRouter.point(n)), end],
    )
    const edge = connection(
      `organic-partner-${pair.id}`,
      `pair:${pair.id}`,
      a.id,
      b.id,
      sampleEdge(roundedEdge(points)),
      'partnership',
    )
    edge.path = roundedEdge(points)
    edge.ended = pair.status === 'ended'
    connections.push(edge)
    lines.add(edge.points, edge.group)
    // A point on a long straight stretch stays exactly on the partner line
    // after its corners are rounded, including non-adjacent partnerships.
    let longest = 0,
      anchor = start
    for (let j = 1; j < points.length; j++) {
      const length = pointDistance(points[j - 1], points[j])
      if (length > longest) {
        longest = length
        anchor = { x: (points[j - 1].x + points[j].x) / 2, y: (points[j - 1].y + points[j].y) / 2 }
      }
    }
    pairRoots.set(pair.id, anchor)
  })

  const parents = new Map<string, Map<string, string[]>>()
  for (const r of [...family.parentages].sort((a, b) => compare(a.id, b.id))) {
    if (!byId.has(r.parent) || !byId.has(r.child) || r.parent === r.child) continue
    if (!parents.has(r.child)) parents.set(r.child, new Map())
    const map = parents.get(r.child)!
    map.set(r.parent, [...(map.get(r.parent) ?? []), r.id])
  }
  const groups = new Map<string, Group>()
  const add = (
    id: string,
    parentIds: string[],
    child: string,
    relationIds: string[],
    root: EdgePoint,
  ) => {
    if (!groups.has(id))
      groups.set(id, {
        id,
        parentIds,
        children: new Map(),
        root,
        exit: id.startsWith('single:') ? { x: root.x, y: root.y - 12 } : root,
        hub: { x: root.x, y: Math.min(...parentIds.map((id) => byId.get(id)!.y)) - portGap },
      })
    groups.get(id)!.children.set(child, relationIds)
  }
  for (const [child, rows] of [...parents].sort(([a], [b]) => compare(a, b))) {
    const ids = [...rows.keys()].sort(compare)
    const pair =
      ids.length === 2
        ? pairs.find((p) => ids.includes(p.personA) && ids.includes(p.personB))
        : undefined
    if (pair) add(`pair:${pair.id}`, ids, child, [...rows.values()].flat(), pairRoots.get(pair.id)!)
    else
      for (const parent of ids) {
        const p = byId.get(parent)!
        add(`single:${parent}`, [parent], child, rows.get(parent)!, {
          x: p.x + CARD_WIDTH / 2,
          y: p.y,
        })
      }
  }
  const childGroups = new Map<string, string[]>()
  for (const group of groups.values())
    for (const child of group.children.keys())
      childGroups.set(child, [...(childGroups.get(child) ?? []), group.id].sort(compare))
  const target = (group: Group, child: string) => {
    const p = byId.get(child)!,
      siblings = childGroups.get(child)!
    const offset =
      (siblings.indexOf(group.id) - (siblings.length - 1) / 2) * Math.min(18, 110 / siblings.length)
    return { x: p.x + CARD_WIDTH / 2 + offset, y: p.y + CARD_HEIGHT + portGap }
  }
  const anchors = [...groups.values()].flatMap((g) => [
    g.root,
    g.exit,
    g.hub,
    ...[...g.children.keys()].map((id) => target(g, id)),
  ])
  const router = new Router(placements, anchors, lines)
  const ordered = [...groups.values()].sort(
    (a, b) =>
      Math.max(...b.parentIds.map((id) => byId.get(id)!.generation)) -
        Math.max(...a.parentIds.map((id) => byId.get(id)!.generation)) || compare(a.id, b.id),
  )
  for (const group of ordered) {
    if (!router.freePoint(group.hub)) {
      const x = [...router.xs]
        .sort((a, b) => Math.abs(a - group.hub.x) - Math.abs(b - group.hub.x))
        .find((x) => router.freePoint({ x, y: group.hub.y }))
      if (x !== undefined) group.hub = { x, y: group.hub.y }
    }
    const adjacency = new Map<string, Set<string>>(),
      points = new Map<string, EdgePoint>(),
      previous = new Map<string, string>(),
      depths = new Map<string, number>()
    const rootKey = pointKey(group.root)
    points.set(rootKey, group.root)
    depths.set(rootKey, 0)
    const addPath = (path: EdgePoint[]) => {
      path.forEach((p) => points.set(pointKey(p), p))
      for (let i = 1; i < path.length; i++) {
        const a = pointKey(path[i - 1]),
          b = pointKey(path[i])
        if (a === b || previous.has(b) || b === rootKey) continue
        if (!adjacency.has(a)) adjacency.set(a, new Set())
        adjacency.get(a)!.add(b)
        previous.set(b, a)
        depths.set(b, (depths.get(a) ?? 0) + pointDistance(path[i - 1], path[i]))
      }
      lines.add(simplifyPoints(path), group.id)
    }
    const trunk = router.route([router.node(group.exit)], group.hub, group.id)
    if (!trunk) throw new Error('Er is geen vrije route voor een gezinstak gevonden.')
    addPath([group.root, ...trunk.map((n) => router.point(n))])
    const available = new Set([router.node(group.hub)])
    const leaves = new Map<string, string>()
    const compareChildren = childOrder(family, group.parentIds)
    const children = [...group.children.keys()].sort(
      (a, b) => byId.get(b)!.y - byId.get(a)!.y || compareChildren(a, b),
    )
    for (const child of children) {
      const end = target(group, child)
      const route =
        router.route(available, end, group.id, true) ?? router.route(available, end, group.id)
      if (!route) throw new Error('Er is geen vrije route voor een familieverbinding gevonden.')
      const path = route.map((n) => router.point(n))
      addPath([...path, { x: end.x, y: end.y - portGap }])
      route.forEach((n) => available.add(n))
      leaves.set(pointKey({ x: end.x, y: end.y - portGap }), child)
    }
    const descendants = new Map<string, Set<string>>()
    for (const [leaf, child] of leaves) {
      let cursor: string | undefined = leaf
      const seen = new Set<string>()
      while (cursor && !seen.has(cursor)) {
        seen.add(cursor)
        if (!descendants.has(cursor)) descendants.set(cursor, new Set())
        descendants.get(cursor)!.add(child)
        cursor = previous.get(cursor)
      }
    }
    const maxDepth = Math.max(1, ...depths.values()),
      width = (key: string) => 3.4 - (1.4 * (depths.get(key) ?? 0)) / maxDepth
    const queue = [rootKey]
    for (let q = 0; q < queue.length; q++) {
      const start = queue[q]
      for (const next of adjacency.get(start) ?? []) {
        const path = [points.get(start)!, points.get(next)!]
        let end = next
        while (adjacency.get(end)?.size === 1) {
          end = [...adjacency.get(end)!][0]
          path.push(points.get(end)!)
        }
        const childIds = [...(descendants.get(end) ?? [])].sort(compareChildren)
        if (!childIds.length) continue
        const edge = connection(
          `organic-${group.id}-${connections.length}`,
          group.id,
          group.parentIds[0],
          childIds[0],
          simplifyPoints(path),
          'parentage',
        )
        edge.parentIds = group.parentIds
        edge.childIds = childIds
        edge.relationIds = childIds.flatMap((id) => group.children.get(id)!)
        edge.startWidth = width(start)
        edge.endWidth = adjacency.get(end)?.size ? width(end) : 1.1
        connections.push(edge)
        queue.push(end)
      }
    }
  }

  // Keep expressive curves in open space. The routed bends remain the safe
  // alternative when smoothing would cut a card or another connection.
  const raw = new Lines(),
    accepted = new Lines()
  connections.forEach((edge) => raw.add(edge.points, edge.id))
  for (const edge of connections) {
    let path = edge.kind === 'partnership' ? edge.path : roundedEdge(edge.points)
    if (edge.kind === 'parentage' && edge.points.length >= 2) {
      const a = edge.points[0],
        b = edge.points[1],
        c = edge.points.at(-2)!,
        d = edge.points.at(-1)!
      const length = Math.min(180, pointDistance(a, d) * 0.42)
      const first = pointDistance(a, b) || 1,
        last = pointDistance(c, d) || 1
      const candidate = `M ${a.x} ${a.y} C ${a.x + ((b.x - a.x) / first) * length} ${a.y + ((b.y - a.y) / first) * length} ${d.x - ((d.x - c.x) / last) * length} ${d.y - ((d.y - c.y) / last) * length} ${d.x} ${d.y}`
      const sampled = sampleEdge(candidate)
      const blocked =
        sampled.some((p) =>
          placements.some(
            (box) =>
              p.x > box.x && p.x < box.x + CARD_WIDTH && p.y > box.y && p.y < box.y + CARD_HEIGHT,
          ),
        ) ||
        sampled.some((p, i) => {
          if (!i) return false
          for (const line of [
            ...raw.near(sampled[i - 1], p),
            ...accepted.near(sampled[i - 1], p),
          ]) {
            if (line.owner === edge.id) continue
            const hit = segmentCrossing(sampled[i - 1], p, line.a, line.b)
            if (!hit) continue
            const at = {
              x: sampled[i - 1].x + (p.x - sampled[i - 1].x) * hit.t,
              y: sampled[i - 1].y + (p.y - sampled[i - 1].y) * hit.t,
            }
            if (pointDistance(at, a) > 5 && pointDistance(at, d) > 5) return true
          }
          return false
        })
      if (!blocked) path = candidate
    }
    edge.path = path
    edge.points = sampleEdge(path)
    accepted.add(edge.points, edge.id)
  }
  // A true underpass is a cut in the lower line, not a paper-colored halo that
  // could erase a related branch. Width still follows the original arc length.
  const crossingIndex = new Lines()
  const byEdge = new Map(connections.map((e) => [e.id, e]))
  const distances = new Map(connections.map((e) => [e.id, edgeDistances(e.points)]))
  const segmentOffsets = new Map<Segment, number>()
  for (const edge of connections) {
    const d = distances.get(edge.id)!
    for (let i = 1; i < edge.points.length; i++)
      for (const line of crossingIndex.near(edge.points[i - 1], edge.points[i])) {
        const lower = byEdge.get(line.owner)!
        if (lower.group === edge.group) continue
        const hit = segmentCrossing(edge.points[i - 1], edge.points[i], line.a, line.b)
        if (!hit) continue
        const offset = segmentOffsets.get(line)! + pointDistance(line.a, line.b) * hit.u
        const upperOffset = d[i - 1] + pointDistance(edge.points[i - 1], edge.points[i]) * hit.t
        const total = distances.get(lower.id)!.at(-1)!
        if (offset > 4 && offset < total - 4 && upperOffset > 4 && upperOffset < d.at(-1)! - 4)
          lower.gaps.push({ from: offset - 5, to: offset + 5 })
      }
    crossingIndex.add(edge.points, edge.id).forEach((line, i) => segmentOffsets.set(line, d[i]))
  }
  for (const edge of connections) {
    edge.outline =
      edge.kind === 'parentage'
        ? taperedEdge(edge.points, edge.startWidth, edge.endWidth, edge.gaps)
        : ''
    edge.path = gappedEdge(edge.points, edge.gaps)
  }
  return connections
}
