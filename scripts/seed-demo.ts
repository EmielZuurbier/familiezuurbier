import { getPayload } from 'payload'
import config from '../src/payload.config'
import { demoFamily } from '../src/lib/demo'
import { planPartnershipChildren } from '../src/lib/relations'
import { databaseConfigured } from '../src/lib/settings'
if (!databaseConfigured()) throw new Error('Stel eerst de database en geheime sleutel in .env in.')
if (!process.argv.includes('--confirm-fictional'))
  throw new Error(
    'Dit voegt FICTIEVE gegevens toe. Bevestig met npm run seed:demo -- --confirm-fictional',
  )
const payload = await getPayload({ config })
for (const collection of ['people', 'parentages', 'partnerships'] as const) {
  if ((await payload.count({ collection, overrideAccess: true })).totalDocs)
    throw new Error('Alleen toegestaan in een lege familiedatabase.')
}
const req = await (await import('payload')).createLocalReq({}, payload)
req.transactionID = (await payload.db.beginTransaction()) ?? undefined
if (!req.transactionID) throw new Error('Geen transactie beschikbaar.')
try {
  const plan = planPartnershipChildren(demoFamily.parentages, demoFamily.partnerships)
  const ids = new Map<string, number>()
  for (const { id, ...data } of demoFamily.people) {
    const person = await payload.create({
      collection: 'people',
      data: { ...data, photo: undefined, avatarPhoto: undefined, isExample: true },
      overrideAccess: true,
      req,
    })
    ids.set(id, person.id)
  }
  for (const r of demoFamily.parentages.filter((r) => !plan.removeIds.includes(r.id)))
    await payload.create({
      collection: 'parentages',
      data: { parent: ids.get(r.parent)!, child: ids.get(r.child)! },
      overrideAccess: true,
      req,
    })
  for (const r of demoFamily.partnerships)
    await payload.create({
      collection: 'partnerships',
      data: {
        personA: ids.get(r.personA)!,
        personB: ids.get(r.personB)!,
        status: r.status,
        children: (plan.updates.find((p) => p.id === r.id)?.children ?? []).map((id) =>
          ids.get(id)!,
        ),
      },
      overrideAccess: true,
      req,
    })
  if (req.transactionID) await payload.db.commitTransaction(req.transactionID)
  console.log('Fictieve proefstamboom opgeslagen. Alle personen zijn voorbeelden.')
} catch (error) {
  if (req.transactionID) await payload.db.rollbackTransaction(req.transactionID)
  throw error
}
await payload.destroy()

process.exit(0)
