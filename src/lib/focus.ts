import type { Family } from './types'
import { CARD_HEIGHT, CARD_WIDTH, BRANCH_GENERATION_GAP, type Placement } from './layout'
import { constrainViewport, type Bounds, type CanvasSize, type Viewport } from './pan'
export const UPWARD_BOTTOM_PADDING = 90
export function placementBounds(placements: Placement[], bottomPadding = 0): Bounds {
  if (!placements.length) return { x: 0, y: 0, width: 0, height: 0 }
  const x = Math.min(...placements.map((p) => p.x)),
    y = Math.min(...placements.map((p) => p.y))
  return {
    x,
    y,
    width: Math.max(...placements.map((p) => p.x + CARD_WIDTH)) - x,
    height: Math.max(...placements.map((p) => p.y + CARD_HEIGHT)) - y + bottomPadding,
  }
}
export function stemPlacements(family: Family, placements: Placement[]): Placement[] {
  const ids = new Set(placements.map((p) => p.id)),
    adjacent = new Map([...ids].map((id) => [id, new Set<string>()]))
  const link = (a: string, b: string) => {
    if (ids.has(a) && ids.has(b)) {
      adjacent.get(a)!.add(b)
      adjacent.get(b)!.add(a)
    }
  }
  family.parentages.forEach((r) => link(r.parent, r.child))
  family.partnerships.forEach((r) => link(r.personA, r.personB))
  const roots = placements
    .filter((p) => p.generation === 0)
    .sort((a, b) => a.id.localeCompare(b.id, 'nl', { numeric: true }))
  let main = new Set<string>()
  for (const root of roots) {
    if (main.has(root.id)) continue
    const component = new Set<string>(),
      queue = [root.id]
    while (queue.length) {
      const id = queue.pop()!
      if (component.has(id)) continue
      component.add(id)
      queue.push(...adjacent.get(id)!)
    }
    if (component.size > main.size) main = component
  }
  return roots.filter((p) => main.has(p.id))
}
export function stemViewport(
  family: Family,
  placements: Placement[],
  size: CanvasSize,
  bounds = placementBounds(placements, UPWARD_BOTTOM_PADDING),
): Viewport {
  if (!placements.length) return { x: size.width / 2, y: size.height / 2, zoom: 0.78 }
  const stem = placementBounds(stemPlacements(family, placements))
  const zoom = Math.max(
    0.16,
    Math.min(
      0.78,
      (size.width - 56) / Math.max(stem.width, 1),
      (size.height - 96) / (BRANCH_GENERATION_GAP * 1.65 + CARD_HEIGHT),
    ),
  )
  return constrainViewport(
    {
      x: size.width / 2 - (stem.x + stem.width / 2) * zoom,
      y: size.height - 64 - (stem.y + stem.height) * zoom,
      zoom,
    },
    bounds,
    size,
  )
}
