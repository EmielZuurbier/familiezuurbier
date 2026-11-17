import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { demoFamily } from '../src/lib/demo'
import { effectiveParentages } from '../src/lib/relations'
import { readFamilyRelations } from '../src/collections/family-data'
import { convertPartnershipChildren } from './lib/convert-children'
if (!process.env.DATABASE_URL)
  throw new Error('Stel DATABASE_URL in voor de afzonderlijke testdatabase.')
const testUrl = new URL(process.env.DATABASE_URL)
testUrl.pathname = '/familieboom_kinderen_test_' + Date.now()
process.env.DATABASE_URL = testUrl.toString()
const { getPayload, createLocalReq } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
if ((await payload.count({ collection: 'people', overrideAccess: true })).totalDocs)
  throw new Error('De testdatabase moet leeg zijn.')
let checks = 0
async function reject(action: () => Promise<unknown>) {
  await assert.rejects(action)
  checks++
}
const password = randomBytes(24).toString('base64url')
try {
  const admin = await payload.create({
    collection: 'administrators',
    data: { name: 'Fictieve testbeheerder', email: 'voorbeeld@example.invalid', password },
    overrideAccess: true,
    context: { bootstrapAdministrator: true },
  })
  const user = { ...admin, collection: 'administrators' as const }
  const auth = { user, overrideAccess: false as const, depth: 0 }
  const ids = new Map<string, number>()
  for (const { id, ...data } of demoFamily.people) {
    const p = await payload.create({
      collection: 'people',
      data: { ...data, photo: undefined, avatarPhoto: undefined, isExample: true },
      ...auth,
    })
    ids.set(id, p.id)
  }
  for (const r of demoFamily.parentages)
    await payload.create({
      collection: 'parentages',
      data: { parent: ids.get(r.parent)!, child: ids.get(r.child)! },
      ...auth,
    })
  const pairs = []
  for (const r of demoFamily.partnerships)
    pairs.push(
      await payload.create({
        collection: 'partnerships',
        data: { personA: ids.get(r.personA)!, personB: ids.get(r.personB)!, status: r.status },
        ...auth,
      }),
    )
  const originalPeople = JSON.stringify(
    (
      await payload.find({
        collection: 'people',
        pagination: false,
        depth: 0,
        overrideAccess: true,
      })
    ).docs,
  )
  const originalAdmins = JSON.stringify(
    (
      await payload.find({
        collection: 'administrators',
        pagination: false,
        depth: 0,
        overrideAccess: true,
      })
    ).docs,
  )
  const dry = await convertPartnershipChildren(payload)
  assert.equal(dry.jointChildren, 9)
  assert.equal(
    (await payload.count({ collection: 'parentages', overrideAccess: true })).totalDocs,
    18,
  )
  checks++
  const done = await convertPartnershipChildren(payload, { apply: true })
  assert.equal(done.jointChildren, 9)
  assert.equal(done.individualRowsReplaced, 18)
  assert.equal(
    (await payload.count({ collection: 'parentages', overrideAccess: true })).totalDocs,
    0,
  )
  checks++
  assert.equal(
    JSON.stringify(
      (
        await payload.find({
          collection: 'people',
          pagination: false,
          depth: 0,
          overrideAccess: true,
        })
      ).docs,
    ),
    originalPeople,
  )
  assert.equal(
    JSON.stringify(
      (
        await payload.find({
          collection: 'administrators',
          pagination: false,
          depth: 0,
          overrideAccess: true,
        })
      ).docs,
    ),
    originalAdmins,
  )
  checks++
  const req = await createLocalReq({}, payload),
    family = await readFamilyRelations(req)
  assert.equal(effectiveParentages(family.manual, family.partnerships).length, 18)
  checks++
  assert.equal((await convertPartnershipChildren(payload, { apply: true })).jointChildren, 0)
  checks++
  const person = async (name: string) =>
    (
      await payload.create({
        collection: 'people',
        data: { name: 'Fictief ' + name, lifeStatus: 'unknown', isExample: true },
        ...auth,
      })
    ).id
  const a = await person('ouder A'),
    b = await person('ouder B'),
    c = await person('kind C'),
    d = await person('ouder D'),
    e = await person('kind E')
  const pair = await payload.create({
    collection: 'partnerships',
    data: { personA: a, personB: b, status: 'unknown', children: [c] },
    ...auth,
  })
  assert.deepEqual(pair.children, [c])
  checks++
  let actual = await readFamilyRelations(req)
  assert.equal(
    effectiveParentages(actual.manual, actual.partnerships).filter((r) => r.child === String(c))
      .length,
    2,
  )
  checks++
  const updated = await payload.update({
    collection: 'partnerships',
    id: pair.id,
    data: { status: 'ended' },
    ...auth,
  })
  assert.deepEqual(updated.children, [c])
  checks++
  const deduped = await payload.update({
    collection: 'partnerships',
    id: pair.id,
    data: { children: [c, c] },
    ...auth,
  })
  assert.deepEqual(deduped.children, [c])
  checks++
  await reject(() =>
    payload.update({ collection: 'partnerships', id: pair.id, data: { children: [a] }, ...auth }),
  )
  await reject(() =>
    payload.update({
      collection: 'partnerships',
      id: pair.id,
      data: { children: [99999999] },
      ...auth,
    }),
  )
  await reject(() =>
    payload.create({ collection: 'parentages', data: { parent: c, child: a }, ...auth }),
  )
  await reject(() =>
    payload.update({ collection: 'partnerships', id: pair.id, data: { personB: d }, ...auth }),
  )
  await reject(() => payload.delete({ collection: 'partnerships', id: pair.id, ...auth }))
  await reject(() =>
    payload.update({
      collection: 'partnerships',
      id: pair.id,
      data: { children: [] },
      overrideAccess: false,
    }),
  )
  await payload.create({
    collection: 'partnerships',
    data: { personA: a, personB: d, status: 'current', children: [e] },
    ...auth,
  })
  actual = await readFamilyRelations(req)
  assert.deepEqual(
    effectiveParentages(actual.manual, actual.partnerships)
      .filter((r) => r.child === String(e))
      .map((r) => r.parent)
      .sort(),
    [String(a), String(d)].sort(),
  )
  checks++
  await reject(() => payload.delete({ collection: 'people', id: e, ...auth }))
  const cyclic = await payload.create({
    collection: 'partnerships',
    data: { personA: c, personB: d, status: 'unknown' },
    ...auth,
  })
  await reject(() =>
    payload.update({ collection: 'partnerships', id: cyclic.id, data: { children: [a] }, ...auth }),
  )
  await payload.create({ collection: 'parentages', data: { parent: a, child: c }, ...auth })
  await payload.update({ collection: 'partnerships', id: pair.id, data: { children: [] }, ...auth })
  actual = await readFamilyRelations(req)
  assert.deepEqual(
    effectiveParentages(actual.manual, actual.partnerships)
      .filter((r) => r.child === String(c))
      .map((r) => r.parent),
    [String(a)],
  )
  checks++
  await payload.delete({ collection: 'partnerships', id: pair.id, ...auth })
  checks++
  const raw = await payload.create({
    collection: 'parentages',
    data: { parent: b, child: e },
    ...auth,
  })
  assert(raw.id)
  checks++
  const x = await person('samenloop X'),
    y = await person('samenloop Y'),
    z = await person('samenloop Z')
  const concurrent = await payload.create({
    collection: 'partnerships',
    data: { personA: x, personB: y, status: 'unknown' },
    ...auth,
  })
  const race = await Promise.allSettled([
    payload.update({
      collection: 'partnerships',
      id: concurrent.id,
      data: { children: [z] },
      ...auth,
    }),
    payload.create({ collection: 'parentages', data: { parent: z, child: x }, ...auth }),
  ])
  assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1)
  checks++
  const aa = await person('samenloop AA'),
    bb = await person('samenloop BB'),
    cc = await person('samenloop CC'),
    dd = await person('samenloop DD')
  const p = await payload.create({
      collection: 'partnerships',
      data: { personA: aa, personB: bb, status: 'unknown' },
      ...auth,
    }),
    q = await payload.create({
      collection: 'partnerships',
      data: { personA: cc, personB: dd, status: 'unknown' },
      ...auth,
    })
  const pairRace = await Promise.allSettled([
    payload.update({ collection: 'partnerships', id: p.id, data: { children: [cc] }, ...auth }),
    payload.update({ collection: 'partnerships', id: q.id, data: { children: [aa] }, ...auth }),
  ])
  assert.equal(pairRace.filter((r) => r.status === 'fulfilled').length, 1)
  checks++
  console.log(
    `${checks} controles geslaagd: één keer invoeren, twee ouders, behoud van bestaande personen/accounts/verbindingen, veilige omzetting, losse uitzonderingen, bewerken/verwijderen, toegangscontrole en gelijktijdige cirkelcontrole.`,
  )
} finally {
  await payload.destroy()
}
process.exit(0)
