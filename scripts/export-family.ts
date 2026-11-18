import { mkdirSync, writeFileSync } from 'node:fs'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { databaseConfigured } from '../src/lib/settings'
if (!databaseConfigured()) throw new Error('Stel eerst DATABASE_URL en PAYLOAD_SECRET in .env in.')
const payload = await getPayload({ config })
try {
  const collections = ['people', 'parentages', 'partnerships', 'events'] as const
  const rows = await Promise.all(
    collections.map((collection) =>
      payload.find({ collection, depth: 0, pagination: false, overrideAccess: true }),
    ),
  )
  const content = {
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    ...Object.fromEntries(collections.map((key, i) => [key, rows[i].docs])),
  }
  mkdirSync('backups', { recursive: true, mode: 0o700 })
  const file = `backups/familiegegevens-${new Date().toISOString().replaceAll(':', '-')}.json`
  writeFileSync(file, JSON.stringify(content, null, 2), { mode: 0o600, flag: 'wx' })
  console.log(`Familiegegevens geëxporteerd zonder beheeraccounts: ${file}`)
} finally {
  await payload.destroy()
}
process.exit(0)
