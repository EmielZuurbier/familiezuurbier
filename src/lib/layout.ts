import type { Family } from './types'
import { childOrder } from './child-order'
export const CARD_WIDTH = 212,
  CARD_HEIGHT = 98,
  COLUMN_GAP = 30,
  GENERATION_GAP = 190
export type Placement = { id: string; x: number; y: number; generation: number }
// Contract partner components only if the resulting parent graph remains acyclic.
// This handles multiple partners without assuming that every child belongs to a couple.
function rankedFamily(family: Family): Placement[] {
  const ids = family.people
    .map((p) => p.id)
    .sort((a, b) => a.localeCompare(b, 'nl', { numeric: true }))
  const group = new Map(ids.map((id) => [id, id]))
  const root = (id: string): string => (group.get(id) === id ? id : root(group.get(id)!))
  const edges = family.parentages.filter((r) => group.has(r.parent) && group.has(r.child))
  function ranks(): Map<string, number> | null {
    const roots = [...new Set(ids.map(root))],
      indegree = new Map(roots.map((id) => [id, 0]))
    const next = new Map(roots.map((id) => [id, new Set<string>()])),
      rank = new Map(roots.map((id) => [id, 0]))
    for (const e of edges) {
      const a = root(e.parent),
        b = root(e.child)
      if (a === b) return null
      if (!next.get(a)!.has(b)) {
        next.get(a)!.add(b)
        indegree.set(b, indegree.get(b)! + 1)
      }
    }
    const queue = roots.filter((id) => indegree.get(id) === 0)
    let visited = 0
    while (queue.length) {
      const id = queue.shift()!
      visited++
      for (const child of next.get(id)!) {
        rank.set(child, Math.max(rank.get(child)!, rank.get(id)! + 1))
        indegree.set(child, indegree.get(child)! - 1)
        if (!indegree.get(child)) queue.push(child)
      }
    }
    return visited === roots.length ? rank : null
  }
  if (!ranks()) throw new Error('De ouder-kindrelaties bevatten een cirkel.')
  for (const p of [...family.partnerships].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!group.has(p.personA) || !group.has(p.personB)) continue
    const a = root(p.personA),
      b = root(p.personB)
    if (a === b) continue
    group.set(b, a)
    if (!ranks()) group.set(b, b)
  }
  const rank = ranks()!,
    blocks = new Map<string, string[]>()
  ids.forEach((id) => {
    const k = root(id)
    blocks.set(k, [...(blocks.get(k) ?? []), id])
  })
  const positions = new Map<string, Placement>()
  const max = Math.max(0, ...rank.values())
  for (let generation = 0; generation <= max; generation++) {
    const row = [...blocks]
      .filter(([key]) => rank.get(key) === generation)
      .map(([key, members]) => {
        const parents = edges
          .filter((e) => members.includes(e.child))
          .map((e) => positions.get(e.parent))
          .filter((p) => !!p)
        const center = parents.length
          ? parents.reduce((sum, p) => sum + p.x + CARD_WIDTH / 2, 0) / parents.length
          : 0
        return {
          key,
          members,
          center,
          width: members.length * (CARD_WIDTH + COLUMN_GAP) - COLUMN_GAP,
        }
      })
      .sort((a, b) => a.center - b.center || a.key.localeCompare(b.key, 'nl', { numeric: true }))
    const width = row.reduce((n, b) => n + b.width, 0) + Math.max(0, row.length - 1) * 80
    let x = -width / 2
    for (const block of row) {
      block.members.forEach((id, i) =>
        positions.set(id, {
          id,
          x: x + i * (CARD_WIDTH + COLUMN_GAP),
          y: generation * GENERATION_GAP,
          generation,
        }),
      )
      x += block.width + 80
    }
  }
  return ids.map((id) => positions.get(id)!)
}

export const BRANCH_GENERATION_GAP = 240
const BRANCH_GAP = 110
const COMPONENT_GAP = 220
const compareId = (a: string, b: string) => a.localeCompare(b, 'nl', { numeric: true })
function stableOffset(id: string): number {
  let value = 0
  for (const char of id) value = (value * 31 + char.charCodeAt(0)) >>> 0
  return ((value % 7) - 3) * 6
}

/** A bottom-up layout with a reserved horizontal territory for each family branch.
 * Partner groups share a level; the primary-parent forest only allocates space.
 * Every actual parentage remains an independent visible connection, including
 * co-parents without a partnership and ancestors shared by several branches.
 */
export function layoutBranchingFamily(family: Family, organic = false): Placement[] {
  // The existing contraction handles multiple partners and rejects contractions
  // that would introduce a generational cycle. Its ranks are input-order stable.
  const ranked = rankedFamily(family)
  if (!ranked.length) return []
  const byId = new Map(ranked.map((p) => [p.id, p]))
  const groups = new Map<string, string>()
  ranked.forEach((p) => groups.set(p.id, p.id))
  const root = (id: string): string => (groups.get(id) === id ? id : root(groups.get(id)!))
  // Same-generation partner components are exactly those safe to contract above.
  for (const p of [...family.partnerships].sort((a, b) => compareId(a.id, b.id))) {
    if (!byId.has(p.personA) || !byId.has(p.personB)) continue
    if (byId.get(p.personA)!.generation !== byId.get(p.personB)!.generation) continue
    const a = root(p.personA),
      b = root(p.personB)
    if (a !== b) groups.set(b, a)
  }
  type Block = {
    key: string
    members: string[]
    generation: number
    width: number
    children: Block[]
    parent?: Block
    span: number
    center: number
    componentCenter: number
    height: number
    rows: Block[][]
  }
  const blocks = new Map<string, Block>()
  for (const p of ranked) {
    const key = root(p.id)
    if (!blocks.has(key))
      blocks.set(key, {
        key,
        members: [],
        generation: p.generation,
        width: 0,
        children: [],
        span: 0,
        center: 0,
        componentCenter: 0,
        height: CARD_HEIGHT,
        rows: [],
      })
    blocks.get(key)!.members.push(p.id)
  }
  const parents = new Map<string, Set<string>>()
  for (const r of family.parentages) {
    if (!groups.has(r.parent) || !groups.has(r.child)) continue
    const a = root(r.parent),
      b = root(r.child)
    if (a !== b) {
      if (!parents.has(b)) parents.set(b, new Set())
      parents.get(b)!.add(a)
    }
  }
  for (const block of blocks.values()) {
    block.members.sort(compareId)
    if (block.members.length > 2) {
      const degree = (id: string) =>
        family.partnerships.filter(
          (p) =>
            (p.personA === id && block.members.includes(p.personB)) ||
            (p.personB === id && block.members.includes(p.personA)),
        ).length
      const hub = [...block.members].sort((a, b) => degree(b) - degree(a) || compareId(a, b))[0]
      const left: string[] = [],
        right: string[] = []
      block.members
        .filter((id) => id !== hub)
        .forEach((id, i) => {
          if (i % 2 === 0) left.unshift(id)
          else right.push(id)
        })
      block.members = [...left, hub, ...right]
    }
    block.width = block.members.length * (CARD_WIDTH + COLUMN_GAP) - COLUMN_GAP
    const candidates = [...(parents.get(block.key) ?? [])]
      .map((key) => blocks.get(key)!)
      .sort((a, b) => b.generation - a.generation || compareId(a.key, b.key))
    if (candidates.length) {
      block.parent = candidates[0]
      block.parent.children.push(block)
    }
  }
  // Stable space reservation prevents collisions at every level, even across
  // disconnected families or when a person has more than one partnership.
  function measure(block: Block): number {
    const compare = childOrder(family, block.members)
    const parentIds = new Set(block.members)
    const anchor = (child: Block) =>
      child.members
        .filter((id) =>
          family.parentages.some(
            (relation) => relation.child === id && parentIds.has(relation.parent),
          ),
        )
        .sort(compare)[0] ?? child.key
    block.children.sort((a, b) => compare(anchor(a), anchor(b)) || compareId(a.key, b.key))
    const childWidth =
      block.children.reduce((sum, child) => sum + measure(child), 0) +
      Math.max(0, block.children.length - 1) * BRANCH_GAP
    if (organic && block.children.length) {
      for (let index = 0; index < block.children.length; index += 3)
        block.rows.push(block.children.slice(index, index + 3))
      block.span = Math.max(
        block.width,
        ...block.rows.map(
          (row) =>
            row.reduce((sum, child) => sum + child.span, 0) + (row.length - 1) * BRANCH_GAP + 120,
        ),
      )
      block.height =
        CARD_HEIGHT +
        block.rows.reduce(
          (sum, row) => sum + Math.max(...row.map((child) => child.height)) + 56 + 150,
          0,
        )
    } else block.span = Math.max(block.width, childWidth)
    return block.span
  }
  const roots = [...blocks.values()]
    .filter((b) => !b.parent)
    .sort((a, b) => compareId(a.key, b.key))
  const total =
    roots.reduce((sum, b) => sum + measure(b), 0) + Math.max(0, roots.length - 1) * COMPONENT_GAP
  if (organic) {
    const planned = new Map<string, { x: number; y: number }>()
    const rowWidth = (row: Block[]) =>
      row.reduce((sum, b) => sum + b.span, 0) + Math.max(0, row.length - 1) * BRANCH_GAP
    const placeBranch = (block: Block, center: number, y: number) => {
      planned.set(block.key, { x: center, y })
      let consumed = 0
      block.rows.forEach((row, rowIndex) => {
        // Fold whole subtrees, rather than scattering individual generations.
        // A reserved rectangle keeps a family's descendants inside its branch.
        const sway = block.rows.length > 1 ? (rowIndex % 2 ? -1 : 1) * 54 : 0
        let x = center - rowWidth(row) / 2 + sway
        for (const child of row) {
          const lift = 28 + stableOffset(child.key) + Math.sin((x - center) / 340) * 10
          placeBranch(child, x + child.span / 2, y - CARD_HEIGHT - 150 - consumed - lift)
          x += child.span + BRANCH_GAP
        }
        consumed += Math.max(...row.map((child) => child.height)) + 56 + 150
      })
    }
    // Independent trees also wrap vertically, so a small disconnected family
    // cannot force an otherwise compact overview into one very wide strip.
    const forestWidth = Math.max(1500, ...roots.map((root) => root.span))
    const forestRows: Block[][] = []
    for (const root of roots) {
      const row = forestRows.at(-1)
      if (!row || row.length >= 3 || rowWidth([...row, root]) > forestWidth) forestRows.push([root])
      else row.push(root)
    }
    let forestY = 0
    for (const row of forestRows) {
      let x = -rowWidth(row) / 2
      for (const block of row) {
        placeBranch(block, x + block.span / 2, forestY)
        x += block.span + BRANCH_GAP
      }
      forestY -= Math.max(...row.map((block) => block.height)) + COMPONENT_GAP
    }
    const placed: { block: Block; x: number; y: number }[] = []
    const resolved = new Map<string, { x: number; y: number }>()
    for (const block of [...blocks.values()].sort(
      (a, b) =>
        a.generation - b.generation ||
        planned.get(b.key)!.y - planned.get(a.key)!.y ||
        compareId(a.key, b.key),
    )) {
      const { x } = planned.get(block.key)!
      let y = planned.get(block.key)!.y
      // Shared ancestors and co-parents can link different reserved branches.
      // Respect every real parent, then clear earlier cards without widening.
      for (const key of parents.get(block.key) ?? [])
        if (resolved.has(key)) y = Math.min(y, resolved.get(key)!.y - CARD_HEIGHT - 64)
      let obstacle
      while (
        (obstacle = placed.find(
          (other) =>
            Math.abs(x - other.x) < (block.width + other.block.width) / 2 + 24 &&
            y < other.y + CARD_HEIGHT + 40 &&
            y + CARD_HEIGHT + 40 > other.y,
        ))
      )
        y = obstacle.y - CARD_HEIGHT - 40
      resolved.set(block.key, { x, y })
      placed.push({ block, x, y })
    }
    const result = new Map<string, Placement>()
    for (const block of blocks.values()) {
      const { x, y } = resolved.get(block.key)!
      block.members.forEach((id, index) =>
        result.set(id, {
          id,
          x: x - block.width / 2 + index * (CARD_WIDTH + COLUMN_GAP),
          y,
          generation: block.generation,
        }),
      )
    }
    return ranked.map((p) => result.get(p.id)!)
  }
  function place(block: Block, center: number, componentCenter: number) {
    block.center = center
    block.componentCenter = componentCenter
    const span =
      block.children.reduce((sum, b) => sum + b.span, 0) +
      Math.max(0, block.children.length - 1) * BRANCH_GAP
    let cursor = center - span / 2
    for (const child of block.children) {
      place(child, cursor + child.span / 2, componentCenter)
      cursor += child.span + BRANCH_GAP
    }
  }
  let cursor = -total / 2
  for (const block of roots) {
    place(block, cursor + block.span / 2, cursor + block.span / 2)
    cursor += block.span + COMPONENT_GAP
  }
  const placements = new Map<string, Placement>()
  for (const block of blocks.values()) {
    const outwardLift = Math.min(48, Math.abs(block.center - block.componentCenter) * 0.06)
    const y =
      block.generation === 0
        ? 0
        : -block.generation * BRANCH_GENERATION_GAP + stableOffset(block.key) - outwardLift
    block.members.forEach((id, index) =>
      placements.set(id, {
        id,
        x: block.center - block.width / 2 + index * (CARD_WIDTH + COLUMN_GAP),
        y,
        generation: block.generation,
      }),
    )
  }
  return ranked.map((p) => placements.get(p.id)!)
}

/** Keep descendants in their family's reserved territory instead of centring
 * each complete generation independently. The main tree grows downwards. */
export function layoutFamily(family: Family): Placement[] {
  return layoutBranchingFamily(family).map((placement) => ({
    ...placement,
    y: placement.generation * BRANCH_GENERATION_GAP,
  }))
}

/** Grow upwards in shelves of at most three complete family branches. Partners
 * stay together; birth order runs left to right, then onto the next higher shelf.
 * Shared-parent constraints and collision clearance apply across every branch. */
export function layoutOrganicFamily(family: Family): Placement[] {
  return layoutBranchingFamily(family, true)
}
