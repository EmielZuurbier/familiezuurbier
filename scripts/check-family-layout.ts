import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { layoutFamily, layoutOrganicFamily, CARD_WIDTH, CARD_HEIGHT } from '../src/lib/layout'
import { effectiveParentages } from '../src/lib/relations'
import { familyFocusOptions, familyFocusPlacements } from '../src/lib/family-focus'
import type { Family } from '../src/lib/types'
import { placementBounds } from '../src/lib/focus'
import { organicParentagePaths } from '../src/lib/organic-connections'
const payload = await getPayload({ config })
try {
  const [people, parents, pairs] = await Promise.all([
    payload.find({
      collection: 'people',
      select: { updatedAt: true, birth: true },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({ collection: 'parentages', pagination: false, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'partnerships', pagination: false, depth: 0, overrideAccess: true }),
  ])
  const id = (v: unknown) => String(v && typeof v === 'object' && 'id' in v ? v.id : v)
  const partnerships = pairs.docs.map((p) => ({
    id: String(p.id),
    personA: id(p.personA),
    personB: id(p.personB),
    status: p.status,
    children: (p.children ?? []).map(id),
  }))
  const family: Family = {
    people: people.docs.map((p, i) => ({
      id: String(p.id),
      name: `Fictieve positie ${i + 1}`,
      birth: p.birth ?? {},
      death: {},
      lifeStatus: 'unknown',
    })),
    partnerships,
    parentages: effectiveParentages(
      parents.docs.map((p) => ({ id: String(p.id), parent: id(p.parent), child: id(p.child) })),
      partnerships,
    ),
  }
  const positions = layoutFamily(family),
    byId = new Map(positions.map((p) => [p.id, p]))
  assert(positions.length === family.people.length, 'Iedere persoon behoudt een plek.')
  for (const r of family.parentages)
    assert(
      byId.get(r.parent)!.y + CARD_HEIGHT < byId.get(r.child)!.y,
      'Een kind moet onder de ouders staan.',
    )
  for (const a of positions)
    for (const b of positions)
      if (a.id !== b.id)
        assert(
          Math.abs(a.x - b.x) >= CARD_WIDTH || Math.abs(a.y - b.y) >= CARD_HEIGHT,
          'Naamkaarten mogen elkaar niet overlappen.',
        )
  const organic = layoutOrganicFamily(family),
    organicById = new Map(organic.map((p) => [p.id, p]))
  const connectionsStart = performance.now()
  const organicPaths = organicParentagePaths(family, organic)
  assert(
    organicPaths.size === family.parentages.length,
    'Alle echte ouder-kindverbindingen blijven zichtbaar.',
  )
  console.log(
    `Verbindingsroutes berekend in ${Math.round(performance.now() - connectionsStart)} ms.`,
  )
  assert(organic.length === positions.length, 'De vrije boom behoudt iedere persoon.')
  for (const relation of family.parentages)
    assert(
      organicById.get(relation.child)!.y + CARD_HEIGHT < organicById.get(relation.parent)!.y,
      'In de vrije boom groeit een kind boven de ouders.',
    )
  for (const a of organic)
    for (const b of organic)
      if (a.id !== b.id)
        assert(
          Math.abs(a.x - b.x) >= CARD_WIDTH || Math.abs(a.y - b.y) >= CARD_HEIGHT,
          'Kaarten in de vrije boom mogen elkaar niet overlappen.',
        )
  const groups = new Map(
    family.people
      .flatMap((person) => familyFocusOptions(family, person.id))
      .map((group) => [group.id, group]),
  )
  for (const group of groups.values()) {
    for (const child of group.childIds)
      for (const parent of group.parentIds)
        assert(
          family.parentages.some(
            (relation) => relation.parent === parent && relation.child === child,
          ),
          'Gezinsfocus mag geen ouderschap afleiden.',
        )
    const ids = new Set([...group.parentIds, ...group.childIds])
    const focused = familyFocusPlacements(positions, group).filter((position) =>
      ids.has(position.id),
    )
    const children = focused
      .filter((p) => group.childIds.includes(p.id))
      .sort((a, b) => a.y - b.y || a.x - b.x)
    assert.deepEqual(
      children.map((p) => p.id),
      group.childIds,
      'De gezinsfocus moet de kindvolgorde per rij behouden.',
    )
    for (const y of new Set(children.map((p) => p.y)))
      assert(
        children.filter((p) => p.y === y).length <= 4,
        'De gezinsfocus toont maximaal vier kinderen per rij.',
      )
    for (const a of focused)
      for (const b of focused)
        if (a.id !== b.id)
          assert(
            Math.abs(a.x - b.x) >= CARD_WIDTH || Math.abs(a.y - b.y) >= CARD_HEIGHT,
            'Kaarten in een gezinsfocus mogen elkaar niet overlappen.',
          )
  }
  console.log(
    `Beide indelingen gecontroleerd voor ${positions.length} personen, ${family.partnerships.length} partnerschappen, ${family.parentages.length} ouder-kindverbindingen en ${groups.size} gezinsfocusopties. Alleen posities berekend; geen namen, geboortedatums of woonplaatsen uitgevoerd en geen gegevens gewijzigd.`,
  )
  const originalBounds = placementBounds(positions),
    compactBounds = placementBounds(organic)
  console.log(
    `Ruimtegebruik: Overzichtelijk ${Math.round(originalBounds.width)} × ${Math.round(originalBounds.height)}; Vrije boom ${Math.round(compactBounds.width)} × ${Math.round(compactBounds.height)}. Alleen afmetingen in schemapunten.`,
  )
} finally {
  await payload.destroy()
}
process.exit(0)
