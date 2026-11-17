import type { Family } from './types'
import { dateError } from './dates'

const compareId = (a: string, b: string) => a.localeCompare(b, 'nl', { numeric: true })

/** Birth order first; the stored joint-children order breaks ties and orders
 * undated children. No dates or saved relationship lists are rewritten. */
export function childOrder(family: Family, parentIds: readonly string[]) {
  const parents = new Set(parentIds)
  const positions = new Map<string, number>()
  for (const pair of family.partnerships
    .filter((pair) =>
      parents.size === 1
        ? parents.has(pair.personA) || parents.has(pair.personB)
        : parents.has(pair.personA) && parents.has(pair.personB),
    )
    .sort((a, b) => compareId(a.id, b.id))) {
    for (const child of pair.children ?? [])
      if (!positions.has(child)) positions.set(child, positions.size)
  }
  const dates = new Map(
    family.people.map((person) => {
      const birth = person.birth
      // A day/month without a birth year cannot establish who is older. Unknown
      // date parts follow known parts within the same year/month, without guessing.
      const key =
        birth.year && !dateError(birth)
          ? [birth.year, birth.month ?? 13, birth.day ?? 32]
          : [Infinity, 0, 0]
      return [person.id, key] as const
    }),
  )
  return (a: string, b: string) => {
    const left = dates.get(a) ?? [Infinity, 0, 0]
    const right = dates.get(b) ?? [Infinity, 0, 0]
    for (let part = 0; part < 3; part++)
      if (left[part] !== right[part]) return left[part] - right[part]
    const aPosition = positions.get(a) ?? Infinity,
      bPosition = positions.get(b) ?? Infinity
    return aPosition !== bPosition ? aPosition - bPosition : compareId(a, b)
  }
}
