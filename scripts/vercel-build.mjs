import { spawnSync } from 'node:child_process'

for (const name of ['DATABASE_URL', 'PAYLOAD_SECRET', 'BLOB_READ_WRITE_TOKEN']) {
  if (!process.env[name]?.trim())
    throw new Error(`Stel ${name} in bij de Vercel environment variables.`)
}
if (process.env.PAYLOAD_SECRET.length < 32)
  throw new Error('PAYLOAD_SECRET moet minimaal 32 tekens bevatten.')
const website = process.env.FAMILY_APP_URL || process.env.NEXT_PUBLIC_SERVER_URL
if (!website)
  throw new Error('Stel FAMILY_APP_URL in op het openbare HTTPS-adres van deze omgeving.')
const origin = new URL(website)
if (origin.protocol !== 'https:' || origin.username || origin.password)
  throw new Error('Gebruik een openbaar HTTPS-adres voor FAMILY_APP_URL.')

function run(args, env = process.env) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

if (process.env.VERCEL_ENV === 'production') {
  // Neon supplies a direct connection for DDL. Keep the pooled connection for the running app.
  run(['node_modules/payload/bin.js', 'migrate'], {
    ...process.env,
    NODE_ENV: 'production',
    DATABASE_URL: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  })
} else {
  console.log(
    'Voorvertoning: geen automatische databasewijzigingen. Gebruik een afzonderlijke, voorbereide previewdatabase.',
  )
}
run(['node_modules/next/dist/bin/next', 'build', '--webpack'])
