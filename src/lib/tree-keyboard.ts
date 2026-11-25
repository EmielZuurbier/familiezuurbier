import type { Family } from './types'
import type { Placement } from './layout'
import { effectiveParentages } from './relations'
import { CARD_HEIGHT, CARD_WIDTH } from './layout'
import type { CanvasSize, Viewport } from './pan'

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
export const isArrowKey = (key: string): key is ArrowKey =>
  ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)

/** Up/down always follow ancestry, including in the upward-growing layout.
 * Lateral keys traverse siblings (including half siblings) and partners in their
 * displayed order. Wrapped family rows continue on the next row. */
export function relatedPerson(
  family: Family,
  placements: Placement[],
  selected: string,
  key: ArrowKey,
  allowed?: ReadonlySet<string>,
  wrapped = false,
): string | null {
  const visible = placements.filter((p) => !allowed || allowed.has(p.id))
  const current = visible.find((p) => p.id === selected)
  if (!current) return null
  const parentages = effectiveParentages(family.parentages, family.partnerships)
  const parents = new Set(parentages.filter((r) => r.child === selected).map((r) => r.parent))
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    const ids =
      key === 'ArrowUp'
        ? parents
        : new Set(parentages.filter((r) => r.parent === selected).map((r) => r.child))
    return (
      visible
        .filter((p) => ids.has(p.id))
        .sort(
          (a, b) =>
            Math.abs(a.x - current.x) - Math.abs(b.x - current.x) ||
            Math.abs(a.y - current.y) - Math.abs(b.y - current.y) ||
            a.id.localeCompare(b.id, 'nl', { numeric: true }),
        )[0]?.id ?? null
    )
  }
  const ids = new Set([
    selected,
    ...parentages.filter((r) => parents.has(r.parent)).map((r) => r.child),
    ...family.partnerships
      .filter((r) => r.personA === selected || r.personB === selected)
      .map((r) => (r.personA === selected ? r.personB : r.personA)),
  ])
  const relatives = visible
    .filter((p) => ids.has(p.id))
    .sort(
      (a, b) =>
        (wrapped ? a.y - b.y || a.x - b.x : a.x - b.x || a.y - b.y) ||
        a.id.localeCompare(b.id, 'nl', { numeric: true }),
    )
  const index = relatives.findIndex((p) => p.id === selected)
  return relatives[index + (key === 'ArrowLeft' ? -1 : 1)]?.id ?? null
}

export function nearestPerson(
  placements: Placement[],
  viewport: Viewport,
  size: CanvasSize,
  allowed?: ReadonlySet<string>,
): string | null {
  const x = (size.width / 2 - viewport.x) / viewport.zoom,
    y = (size.height / 2 - viewport.y) / viewport.zoom
  return (
    placements
      .filter((p) => !allowed || allowed.has(p.id))
      .sort(
        (a, b) =>
          Math.hypot(a.x + CARD_WIDTH / 2 - x, a.y + CARD_HEIGHT / 2 - y) -
          Math.hypot(b.x + CARD_WIDTH / 2 - x, b.y + CARD_HEIGHT / 2 - y),
      )[0]?.id ?? null
  )
}

export function keyboardViewport(viewport: Viewport, key: ArrowKey, fast = false): Viewport {
  const step = fast ? 160 : 56
  return {
    ...viewport,
    x: viewport.x + (key === 'ArrowLeft' ? step : key === 'ArrowRight' ? -step : 0),
    y: viewport.y + (key === 'ArrowUp' ? step : key === 'ArrowDown' ? -step : 0),
  }
}
