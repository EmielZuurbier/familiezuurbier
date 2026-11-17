import { chmodSync, closeSync, mkdirSync, openSync, unlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
mkdirSync('backups', { recursive: true, mode: 0o700 })
const file = `backups/familieboom-${new Date().toISOString().replaceAll(':', '-')}.dump`
const descriptor = openSync(file, 'wx', 0o600)
const result = spawnSync(
  'docker',
  ['compose', 'exec', '-T', 'db', 'pg_dump', '-U', 'familieboom', '-Fc', 'familieboom'],
  { stdio: ['ignore', descriptor, 'pipe'] },
)
closeSync(descriptor)
if (result.status !== 0) {
  unlinkSync(file)
  throw new Error(
    'Back-up niet gemaakt. Controleer of de lokale Docker-database draait. ' +
      (result.stderr?.toString() ?? result.error?.message ?? ''),
  )
}
chmodSync(file, 0o600)
console.log(`Databaseback-up opgeslagen: ${file}`)
