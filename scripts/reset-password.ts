import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { databaseConfigured } from '../src/lib/settings'
import { promptPassword } from './prompt-password'
if (!databaseConfigured()) throw new Error('De lokale database is nog niet ingesteld.')
const payload = await getPayload({ config })
const rl = createInterface({ input: stdin, output: stdout })
const email = (await rl.question('E-mailadres van de bestaande beheerder: ')).trim()
rl.close()
const people = await payload.find({
  collection: 'administrators',
  where: { email: { equals: email } },
  overrideAccess: true,
})
if (people.totalDocs !== 1) throw new Error('Geen beheerder met dit e-mailadres gevonden.')
const password = await promptPassword('Nieuw wachtwoord (minimaal 14 tekens, invoer verborgen): ')
if (password.length < 14) throw new Error('Gebruik minimaal 14 tekens.')
await payload.update({
  collection: 'administrators',
  id: people.docs[0].id,
  data: { password },
  overrideAccess: true,
})
await payload.unlock({
  collection: 'administrators',
  data: { email, password },
  overrideAccess: true,
})
await payload.destroy()
console.log('Lokaal wachtwoord hersteld. Log opnieuw in via /admin.')
process.exit(0)
