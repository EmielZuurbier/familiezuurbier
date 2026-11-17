import { CARD_HEIGHT, CARD_WIDTH, COLUMN_GAP, type Placement } from './layout'
export function partnershipDetour(a: Placement, b: Placement): boolean {
  return Math.abs(a.x - b.x) > CARD_WIDTH + COLUMN_GAP + 1 || Math.abs(a.y - b.y) > 1
}
// Lift long partner links around intermediate cards rather than through their text.
export function partnershipPath(sx: number, sy: number, tx: number, ty: number, lane = 0): string {
  const y = Math.max(sy, ty) + CARD_HEIGHT / 2 + 22 + (lane % 3) * 13
  return `M ${sx} ${sy} C ${sx + 16} ${sy} ${sx + 16} ${y} ${sx + 32} ${y} L ${tx - 32} ${y} C ${tx - 16} ${y} ${tx - 16} ${ty} ${tx} ${ty}`
}

import type { Family } from './types'
export function parentageJunctions(
  family: Family,
  placements: Placement[],
): Map<string, { x: number; y: number }> {
  const byId = new Map(placements.map((p) => [p.id, p])),
    parentsByChild = new Map<string, string[]>()
  for (const r of family.parentages) {
    if (!byId.has(r.parent) || !byId.has(r.child)) continue
    parentsByChild.set(r.child, [...(parentsByChild.get(r.child) ?? []), r.parent])
  }
  const sets = new Map<string, string[]>()
  for (const [child, parents] of parentsByChild) {
    const key = [...new Set(parents)].sort().join(':')
    sets.set(key, [...(sets.get(key) ?? []), child])
  }
  const result = new Map<string, { x: number; y: number }>()
  for (const r of family.parentages) {
    const parents = [...new Set(parentsByChild.get(r.child) ?? [])]
      .sort()
      .map((id) => byId.get(id)!)
    if (!parents.length || !byId.has(r.child)) continue
    const key = [...new Set(parents.map((p) => p.id))].sort().join(':')
    const children = sets.get(key)!.map((id) => byId.get(id)!)
    const downward = Math.min(...children.map((p) => p.y)) > Math.max(...parents.map((p) => p.y))
    result.set(r.id, {
      x: parents.reduce((sum, p) => sum + p.x + CARD_WIDTH / 2, 0) / parents.length,
      y: downward
        ? (Math.max(...parents.map((p) => p.y + CARD_HEIGHT)) +
            Math.min(...children.map((p) => p.y))) /
          2
        : (Math.min(...parents.map((p) => p.y)) +
            Math.max(...children.map((p) => p.y + CARD_HEIGHT))) /
          2,
    })
  }
  return result
}
export function parentagePath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  junction: { x: number; y: number },
): string {
  const { x, y } = junction,
    first = y - sy,
    second = ty - y
  return `M ${sx} ${sy} C ${sx} ${sy + first * 0.6} ${x} ${y - first * 0.25} ${x} ${y} C ${x} ${y + second * 0.45} ${tx} ${ty - second * 0.4} ${tx} ${ty}`
}
