import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { promptPassword } from './prompt-password'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { databaseConfigured } from '../src/lib/settings'
if (!databaseConfigured())
  throw new Error('Stel DATABASE_URL en PAYLOAD_SECRET (minimaal 32 tekens) in .env in.')
const payload = await getPayload({ config })
const count = await payload.count({ collection: 'administrators', overrideAccess: true })
if (count.totalDocs)
  throw new Error('Er bestaat al een beheerder. Voeg verdere beheerders toe via /admin.')
const rl = createInterface({ input: stdin, output: stdout })
const name = (await rl.question('Naam beheerder: ')).trim()
const email = (await rl.question('E-mailadres beheerder: ')).trim()
rl.close()
const password = await promptPassword()
if (!name || !email.includes('@') || password.length < 14)
  throw new Error('Gebruik een naam, geldig e-mailadres en minimaal 14 tekens voor het wachtwoord.')
await payload.create({
  collection: 'administrators',
  data: { name, email, password },
  overrideAccess: true,
  context: { bootstrapAdministrator: true },
})
console.log('Beheerder aangemaakt. Open /admin en log in.')
await payload.destroy()

process.exit(0)
