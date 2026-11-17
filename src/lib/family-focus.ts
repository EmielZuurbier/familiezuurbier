import type { Family } from './types'
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  COLUMN_GAP,
  BRANCH_GENERATION_GAP,
  type Placement,
} from './layout'
import type { CanvasSize, Viewport } from './pan'
import { placementBounds } from './focus'
import { childOrder } from './child-order'

export type FamilyFocus = {
  id: string
  label: string
  parentIds: string[]
  childIds: string[]
  origin?: boolean
}
const compare = (a: string, b: string) => a.localeCompare(b, 'nl', { numeric: true })
export const FAMILY_FOCUS_COLUMNS = 4
const FOCUS_ROW_GAP = CARD_HEIGHT + 84

export function familyFocusOptions(family: Family, personId: string): FamilyFocus[] {
  const people = new Map(family.people.map((person) => [person.id, person]))
  if (!people.has(personId)) return []
  const parents = new Map<string, Set<string>>()
  const add = (parent: string, child: string) => {
    if (!people.has(parent) || !people.has(child) || parent === child) return
    if (!parents.has(child)) parents.set(child, new Set())
    parents.get(child)!.add(parent)
  }
  family.parentages.forEach((r) => add(r.parent, r.child))
  family.partnerships.forEach((pair) =>
    pair.children?.forEach((child) => {
      add(pair.personA, child)
      add(pair.personB, child)
    }),
  )
  const groups: FamilyFocus[] = []
  const make = (parentIds: string[], childIds: string[], origin = false) => {
    parentIds = [...new Set(parentIds)].filter((id) => people.has(id)).sort(compare)
    childIds = [...new Set(childIds)]
      .filter((id) => people.has(id) && !parentIds.includes(id))
      .sort(childOrder(family, parentIds))
    if (!parentIds.length) return
    const id = parentIds.join(':')
    const existing = groups.find((group) => group.id === id)
    if (existing) {
      existing.childIds = [...new Set([...existing.childIds, ...childIds])].sort(
        childOrder(family, parentIds),
      )
      return
    }
    groups.push({
      id,
      label: parentIds.map((id) => people.get(id)!.name).join(' & '),
      parentIds,
      childIds,
      origin,
    })
  }
  const childrenOf = (parentIds: string[]) =>
    [...parents].filter(([, ids]) => parentIds.every((id) => ids.has(id))).map(([child]) => child)
  for (const pair of family.partnerships) {
    if (pair.personA !== personId && pair.personB !== personId) continue
    if (!people.has(pair.personA) || !people.has(pair.personB)) continue
    make([pair.personA, pair.personB], childrenOf([pair.personA, pair.personB]))
  }
  const assigned = new Set(groups.flatMap((group) => group.childIds))
  for (const [child, parentIds] of parents)
    if (parentIds.has(personId) && !assigned.has(child))
      make(
        [...parentIds],
        [...parents]
          .filter(
            ([, ids]) => ids.size === parentIds.size && [...parentIds].every((id) => ids.has(id)),
          )
          .map(([id]) => id),
      )
  // A person without a family of their own can focus their recorded parents and siblings.
  if (!groups.length && parents.has(personId)) {
    const parentIds = [...parents.get(personId)!]
    make(parentIds, childrenOf(parentIds), true)
  }
  return groups.sort((a, b) => compare(a.id, b.id))
}

export function familyFocusPlacements(
  base: Placement[],
  group: FamilyFocus,
  upwards = false,
): Placement[] {
  const parents = base.filter((p) => group.parentIds.includes(p.id))
  if (!parents.length) return base
  const bounds = placementBounds(parents)
  const center = bounds.x + bounds.width / 2
  const top = Math.min(...parents.map((p) => p.y))
  const direction = upwards ? -1 : 1
  const rows = (ids: string[], y: number) =>
    ids.map((id, index) => {
      const row = Math.floor(index / FAMILY_FOCUS_COLUMNS)
      const columns = Math.min(FAMILY_FOCUS_COLUMNS, ids.length - row * FAMILY_FOCUS_COLUMNS)
      return {
        id,
        x:
          center -
          (columns * (CARD_WIDTH + COLUMN_GAP) - COLUMN_GAP) / 2 +
          (index % FAMILY_FOCUS_COLUMNS) * (CARD_WIDTH + COLUMN_GAP),
        y: y + direction * row * FOCUS_ROW_GAP,
      }
    })
  const parentRows = Math.ceil(group.parentIds.length / FAMILY_FOCUS_COLUMNS)
  const positions = new Map(
    [
      ...rows(group.parentIds, top),
      ...rows(
        group.childIds,
        top + direction * ((parentRows - 1) * FOCUS_ROW_GAP + BRANCH_GENERATION_GAP),
      ),
    ].map((p) => [p.id, p]),
  )
  return base.map((p) => (positions.has(p.id) ? { ...p, ...positions.get(p.id)! } : p))
}

/** Share a central stem in the gap between columns, branching above each row.
 * Long links to later rows must not curve through earlier children's cards. */
export function familyFocusParentagePaths(
  family: Family,
  placements: Placement[],
  group: FamilyFocus,
  upwards = false,
): Map<string, string> {
  if (
    group.childIds.length <= FAMILY_FOCUS_COLUMNS &&
    group.parentIds.length <= FAMILY_FOCUS_COLUMNS
  )
    return new Map()
  const byId = new Map(placements.map((p) => [p.id, p]))
  const parents = group.parentIds.map((id) => byId.get(id)).filter((p) => !!p)
  if (!parents.length) return new Map()
  const bounds = placementBounds(parents)
  const center = bounds.x + bounds.width / 2
  const direction = upwards ? -1 : 1
  const paths = new Map<string, string>()
  for (const relation of family.parentages) {
    if (!group.parentIds.includes(relation.parent) || !group.childIds.includes(relation.child))
      continue
    const parent = byId.get(relation.parent),
      child = byId.get(relation.child)
    if (!parent || !child) continue
    const sx = parent.x + CARD_WIDTH / 2,
      tx = child.x + CARD_WIDTH / 2
    const sy = parent.y + (upwards ? 0 : CARD_HEIGHT)
    const ty = child.y + (upwards ? CARD_HEIGHT : 0)
    const join = sy + direction * 36,
      branch = ty - direction * 36
    paths.set(relation.id, `M ${sx} ${sy} V ${join} H ${center} V ${branch} H ${tx} V ${ty}`)
  }
  return paths
}

export function familyFocusViewport(
  placements: Placement[],
  group: FamilyFocus,
  size: CanvasSize,
): Viewport {
  const ids = new Set([...group.parentIds, ...group.childIds])
  const bounds = placementBounds(placements.filter((p) => ids.has(p.id)))
  const top = 94,
    bottom = size.width < 600 ? 156 : 192
  const width = Math.max(1, size.width - 48),
    height = Math.max(1, size.height - top - bottom)
  const zoom = Math.max(
    0.04,
    Math.min(
      1.15,
      width / Math.max(CARD_WIDTH, bounds.width),
      height / Math.max(CARD_HEIGHT, bounds.height),
    ),
  )
  return {
    x: size.width / 2 - (bounds.x + bounds.width / 2) * zoom,
    y: top + height / 2 - (bounds.y + bounds.height / 2) * zoom,
    zoom,
  }
}
