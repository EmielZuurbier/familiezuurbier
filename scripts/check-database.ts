// An isolated integration database. Never deletes or rewrites the configured family database.
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ontbreekt.')
const url = new URL(process.env.DATABASE_URL)
url.pathname = '/familieboom_check_' + Date.now()
process.env.DATABASE_URL = url.toString()
process.env.FAMILY_DATA_MODE = 'database'
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
let checks = 0
async function denied(action: () => Promise<unknown>, message: string) {
  await assert.rejects(action, message)
  checks++
}
try {
  await denied(
    () =>
      payload.create({
        collection: 'administrators',
        data: {
          email: 'unauthorized@example.invalid',
          password: randomBytes(24).toString('hex'),
          name: 'Anoniem',
        },
        overrideAccess: false,
      }),
    'anoniem beheerders aanmaken',
  )
  await denied(
    () =>
      payload.create({
        collection: 'administrators',
        data: {
          email: 'first@example.invalid',
          password: randomBytes(24).toString('hex'),
          name: 'Eerste',
        },
        overrideAccess: true,
      }),
    'first-register mag de hook niet omzeilen',
  )
  const admin = await payload.create({
    collection: 'administrators',
    data: {
      email: 'test@example.invalid',
      password: randomBytes(24).toString('hex'),
      name: 'Fictieve testbeheerder',
    },
    overrideAccess: true,
    context: { bootstrapAdministrator: true },
  })
  const user = { ...admin, collection: 'administrators' as const }
  await denied(
    () => payload.find({ collection: 'people', overrideAccess: false }),
    'privépersonen anoniem lezen',
  )
  await denied(
    () =>
      payload.create({
        collection: 'people',
        data: { name: 'Niet toegestaan', lifeStatus: 'unknown' },
        overrideAccess: false,
      }),
    'personen anoniem wijzigen',
  )
  const a = await payload.create({
    collection: 'people',
    data: { name: 'Fictief A', birth: { year: 1920 }, lifeStatus: 'unknown' },
    user,
    overrideAccess: false,
  })
  const b = await payload.create({
    collection: 'people',
    data: { name: 'Fictief B', lifeStatus: 'unknown' },
    user,
    overrideAccess: false,
  })
  const c = await payload.create({
    collection: 'people',
    data: { name: 'Fictief C', lifeStatus: 'unknown' },
    user,
    overrideAccess: false,
  })
  await payload.create({
    collection: 'parentages',
    data: { parent: a.id, child: b.id },
    user,
    overrideAccess: false,
  })
  await payload.create({
    collection: 'parentages',
    data: { parent: b.id, child: c.id },
    user,
    overrideAccess: false,
  })
  await denied(
    () =>
      payload.create({
        collection: 'parentages',
        data: { parent: c.id, child: a.id },
        user,
        overrideAccess: false,
      }),
    'vooroudercirkel',
  )
  await denied(
    () =>
      payload.create({
        collection: 'parentages',
        data: { parent: a.id, child: b.id },
        user,
        overrideAccess: false,
      }),
    'dubbel ouderschap',
  )
  await denied(
    () =>
      payload.create({
        collection: 'parentages',
        data: { parent: a.id, child: a.id },
        user,
        overrideAccess: false,
      }),
    'eigen ouder',
  )
  await payload.create({
    collection: 'partnerships',
    data: { personA: a.id, personB: b.id, status: 'unknown' },
    user,
    overrideAccess: false,
  })
  await denied(
    () =>
      payload.create({
        collection: 'partnerships',
        data: { personA: b.id, personB: a.id, status: 'unknown' },
        user,
        overrideAccess: false,
      }),
    'omgekeerd dubbel partnerschap',
  )
  await denied(
    () =>
      payload.create({
        collection: 'partnerships',
        data: { personA: a.id, personB: a.id, status: 'unknown' },
        user,
        overrideAccess: false,
      }),
    'eigen partner',
  )
  await payload.create({
    collection: 'partnerships',
    data: { personA: a.id, personB: c.id, status: 'unknown' },
    user,
    overrideAccess: false,
  })
  checks++
  await denied(
    () => payload.delete({ collection: 'people', id: a.id, user, overrideAccess: false }),
    'persoon met relaties verwijderen',
  )
  await denied(
    () =>
      payload.update({
        collection: 'people',
        id: a.id,
        data: { birth: { year: 1900, month: 2, day: 29 } },
        user,
        overrideAccess: false,
      }),
    'ongeldige kalenderdatum',
  )
  await denied(
    () =>
      payload.update({
        collection: 'people',
        id: a.id,
        data: { death: { year: 2000 } },
        user,
        overrideAccess: false,
      }),
    'geen impliciete levensstatus',
  )
  await denied(
    () =>
      payload.update({
        collection: 'people',
        id: a.id,
        data: { lifeStatus: 'deceased', death: { year: 1900 } },
        user,
        overrideAccess: false,
      }),
    'overlijden voor geboorte',
  )
  await denied(
    () =>
      payload.delete({ collection: 'administrators', id: admin.id, user, overrideAccess: false }),
    'laatste beheerder verwijderen',
  )
  // Two concurrent individually valid writes would form a cycle together.
  const x = await payload.create({
    collection: 'people',
    data: { name: 'Fictief X', lifeStatus: 'unknown' },
    user,
    overrideAccess: false,
  })
  const y = await payload.create({
    collection: 'people',
    data: { name: 'Fictief Y', lifeStatus: 'unknown' },
    user,
    overrideAccess: false,
  })
  const simultaneous = await Promise.allSettled([
    payload.create({
      collection: 'parentages',
      data: { parent: x.id, child: y.id },
      user,
      overrideAccess: false,
    }),
    payload.create({
      collection: 'parentages',
      data: { parent: y.id, child: x.id },
      user,
      overrideAccess: false,
    }),
  ])
  assert.equal(simultaneous.filter((r) => r.status === 'fulfilled').length, 1)
  checks++
  assert.equal(
    (await payload.find({ collection: 'people', user, overrideAccess: false })).totalDocs,
    5,
  )
  checks++
  await payload.destroy()
  const again = await getPayload({ config, key: 'persistent-check' })
  assert.equal((await again.count({ collection: 'people', overrideAccess: true })).totalDocs, 5)
  checks++
  await again.destroy()
  console.log(
    `${checks} databasecontroles geslaagd (rechten, relaties, datums, gelijktijdigheid en heropenen).`,
  )
  console.log(
    `Geïsoleerde fictieve testdatabase: ${url.pathname.slice(1)}. De familiedatabase is niet gewijzigd.`,
  )
} catch (error) {
  await payload.destroy()
  throw error
}

process.exit(0)
