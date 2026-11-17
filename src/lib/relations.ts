import type { Parentage } from './types'
export function relationKey(a: string, b: string, unordered = false): string {
  return (unordered ? [a, b].sort() : [a, b]).join(':')
}
export function parentageError(
  parent: string,
  child: string,
  relations: Parentage[],
  excludeId?: string,
): string | undefined {
  if (parent === child) return 'Een persoon kan niet de eigen ouder zijn.'
  const others = relations.filter((r) => r.id !== excludeId)
  if (others.some((r) => r.parent === parent && r.child === child))
    return 'Deze ouder-kindrelatie bestaat al.'
  const seen = new Set<string>(),
    pending = [child]
  while (pending.length) {
    const id = pending.pop()!
    if (id === parent) return 'Deze relatie maakt een cirkel: een persoon wordt de eigen voorouder.'
    if (seen.has(id)) continue
    seen.add(id)
    for (const r of others) if (r.parent === id) pending.push(r.child)
  }
}

import type { Partnership } from './types'
/** One effective edge per parent and child, regardless of how it was entered. */
export function effectiveParentages(manual: Parentage[], partnerships: Partnership[]): Parentage[] {
  const edges = new Map<string, Parentage>()
  for (const relation of manual) edges.set(relationKey(relation.parent, relation.child), relation)
  for (const pair of partnerships)
    for (const child of pair.children ?? [])
      for (const parent of [pair.personA, pair.personB]) {
        const key = relationKey(parent, child)
        if (!edges.has(key))
          edges.set(key, { id: `partnership-${pair.id}-${parent}-${child}`, parent, child })
      }
  return [...edges.values()]
}
export function ancestryCycleError(relations: Parentage[]): string | undefined {
  const next = new Map<string, Set<string>>(),
    degree = new Map<string, number>()
  for (const { parent, child } of relations) {
    if (parent === child) return 'Een persoon kan niet de eigen ouder of het eigen kind zijn.'
    if (!degree.has(parent)) degree.set(parent, 0)
    if (!degree.has(child)) degree.set(child, 0)
    if (!next.has(parent)) next.set(parent, new Set())
    if (!next.get(parent)!.has(child)) {
      next.get(parent)!.add(child)
      degree.set(child, degree.get(child)! + 1)
    }
  }
  const queue = [...degree].filter(([, n]) => n === 0).map(([id]) => id)
  let visited = 0
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]
    visited++
    for (const child of next.get(id) ?? []) {
      degree.set(child, degree.get(child)! - 1)
      if (!degree.get(child)) queue.push(child)
    }
  }
  if (visited !== degree.size)
    return 'Deze wijziging maakt een cirkel: een persoon wordt de eigen voorouder.'
}
export function planPartnershipChildren(manual: Parentage[], partnerships: Partnership[]) {
  const byChild = new Map<string, Parentage[]>()
  for (const relation of manual)
    byChild.set(relation.child, [...(byChild.get(relation.child) ?? []), relation])
  const updates = new Map<string, string[]>(),
    removeIds: string[] = []
  let children = 0,
    unresolved = 0
  for (const [child, rows] of byChild) {
    // Existing explicit joint links and three-or-more-parent cases are untouched.
    if (partnerships.some((pair) => pair.children?.includes(child))) {
      unresolved++
      continue
    }
    const parents = [...new Set(rows.map((r) => r.parent))]
    const matches = partnerships.filter(
      (pair) =>
        parents.length === 2 && parents.includes(pair.personA) && parents.includes(pair.personB),
    )
    if (matches.length !== 1) {
      unresolved++
      continue
    }
    const pair = matches[0]
    updates.set(pair.id, [...(updates.get(pair.id) ?? pair.children ?? []), child])
    removeIds.push(...rows.map((r) => r.id))
    children++
  }
  return {
    updates: [...updates].map(([id, children]) => ({ id, children: [...new Set(children)] })),
    removeIds,
    children,
    unresolved,
  }
}
