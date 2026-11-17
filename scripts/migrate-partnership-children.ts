import { getPayload } from 'payload'
import config from '../src/payload.config'
import { databaseConfigured } from '../src/lib/settings'
import { convertPartnershipChildren } from './lib/convert-children'
if (!databaseConfigured()) throw new Error('Stel eerst de lokale database in.')
const payload = await getPayload({ config })
try {
  const result = await convertPartnershipChildren(payload, {
    apply: process.argv.includes('--apply'),
  })
  console.log(
    `${result.applied ? 'Omgezet' : 'Voorstel, nog niet uitgevoerd'}: ${result.jointChildren} gezamenlijke kinderen bij ${result.partnerships} partnerschappen; ${result.individualRowsReplaced} afzonderlijke invoerregels vervangen zonder familieverbindingen te wijzigen.`,
  )
  if (result.unresolvedChildren)
    console.log(
      `${result.unresolvedChildren} andere kinderen behouden hun afzonderlijke ouder-kindkoppelingen.`,
    )
  if (result.backupFile)
    console.log(
      'Een privéherstelbestand met de oorspronkelijke relaties is opgeslagen in .local-migrations.',
    )
} finally {
  await payload.destroy()
}
process.exit(0)
