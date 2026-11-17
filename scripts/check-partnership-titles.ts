import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

if (!process.env.DATABASE_URL) throw new Error('Een lokale database is nodig.')
const database = new URL(process.env.DATABASE_URL)
database.pathname = `/familieboom_titels_test_${Date.now()}`
process.env.DATABASE_URL = database.toString()
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
let checks = 0
try {
  const admin = await payload.create({
    collection: 'administrators',
    overrideAccess: true,
    data: {
      name: 'Fictieve beheerder',
      email: 'titels@example.invalid',
      password: randomBytes(24).toString('hex'),
    },
    context: { bootstrapAdministrator: true },
  })
  const auth = {
    user: { ...admin, collection: 'administrators' as const },
    overrideAccess: false,
    depth: 0,
  }
  const person = (name: string) =>
    payload.create({
      collection: 'people',
      data: { name, isExample: true, lifeStatus: 'unknown' },
      ...auth,
    })
  const first = await person('Alex Voorbeeld'),
    second = await person('Robin van de Linde'),
    child = await person('Sam Voorbeeld')
  const pair = await payload.create({
    collection: 'partnerships',
    data: {
      personA: first.id,
      personB: second.id,
      children: [child.id],
      status: 'current',
      title: 'Mag niet worden overgenomen',
    },
    ...auth,
  })
  assert.equal(pair.title, 'Alex Voorbeeld & Robin van de Linde')
  checks++
  const originalLinks = {
    personA: pair.personA,
    personB: pair.personB,
    children: pair.children,
    status: pair.status,
  }
  await payload.update({
    collection: 'people',
    id: second.id,
    data: { name: 'Robin Voorbeeld' },
    ...auth,
  })
  const renamed = await payload.findByID({ collection: 'partnerships', id: pair.id, ...auth })
  assert.equal(renamed.title, 'Alex Voorbeeld & Robin Voorbeeld')
  checks++
  assert.deepEqual(
    {
      personA: renamed.personA,
      personB: renamed.personB,
      children: renamed.children,
      status: renamed.status,
    },
    originalLinks,
  )
  checks++
  const search = await payload.find({
    collection: 'partnerships',
    where: { title: { contains: 'Robin Voorbeeld' } },
    sort: 'title',
    ...auth,
  })
  assert.equal(search.docs[0]?.id, pair.id)
  checks++
  const edited = await payload.update({
    collection: 'partnerships',
    id: pair.id,
    data: { title: 'Verkeerde titel', status: 'ended' },
    ...auth,
  })
  assert.equal(edited.title, renamed.title)
  checks++
  await payload.update({
    collection: 'people',
    id: first.id,
    data: { name: 'Alex de Wit' },
    ...auth,
  })
  assert.equal(
    (await payload.findByID({ collection: 'partnerships', id: pair.id, ...auth })).title,
    'Alex de Wit & Robin Voorbeeld',
  )
  checks++
  await assert.rejects(
    payload.find({ collection: 'partnerships', overrideAccess: false, user: null }),
  )
  checks++
  console.log(
    `${checks} controles geslaagd: beide namen, automatische hernoeming van beide partners, behoud van kinderen en status, zoeken/sorteren, bescherming tegen handmatige titels en afgeschermde toegang. Uitsluitend fictieve personen in een afzonderlijke testdatabase.`,
  )
} finally {
  await payload.destroy()
}
process.exit(0)
