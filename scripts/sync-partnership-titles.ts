import assert from 'node:assert/strict'
import { createLocalReq, getPayload } from 'payload'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import config from '../src/payload.config'
import { relationLock } from '../src/collections/collections'

// For existing development databases: only fill derived labels, preserving every other value.
const payload = await getPayload({ config })
const req = await createLocalReq({}, payload)
req.transactionID = (await payload.db.beginTransaction()) ?? undefined
if (!req.transactionID) throw new Error('Bijwerken vereist een databasetransactie.')
try {
  await relationLock(req)
  const read = async () =>
    (
      await payload.find({
        collection: 'partnerships',
        pagination: false,
        depth: 0,
        sort: 'id',
        overrideAccess: true,
        req,
      })
    ).docs
  const before = await read()
  const db = payload.db as unknown as PostgresAdapter
  await db.sessions[await req.transactionID].db.execute(sql`
    UPDATE "partnerships" AS pair
    SET "title" = first_person."name" || ' & ' || second_person."name"
    FROM "people" AS first_person, "people" AS second_person
    WHERE pair."person_a_id" = first_person."id"
      AND pair."person_b_id" = second_person."id"
      AND pair."title" IS DISTINCT FROM first_person."name" || ' & ' || second_person."name"
  `)
  const after = await read()
  const withoutTitle = (docs: typeof after) => docs.map(doc => ({ ...doc, title: undefined }))
  assert.deepEqual(
    withoutTitle(after),
    withoutTitle(before),
    'Alle bestaande gegevens blijven behouden.',
  )
  const people = await payload.find({
    collection: 'people',
    pagination: false,
    depth: 0,
    select: { name: true },
    overrideAccess: true,
    req,
  })
  const names = new Map(people.docs.map((person) => [person.id, person.name]))
  for (const pair of after)
    assert.equal(
      pair.title,
      `${names.get(Number(pair.personA))} & ${names.get(Number(pair.personB))}`,
    )
  await payload.db.commitTransaction(await req.transactionID)
  console.log(
    `${after.length} partnerschaptitels gecontroleerd. Alleen titels bijgewerkt; personen, relaties en overige velden behouden. Geen namen uitgevoerd.`,
  )
} catch (error) {
  await payload.db.rollbackTransaction(await req.transactionID)
  throw error
} finally {
  await payload.destroy()
}
process.exit(0)
