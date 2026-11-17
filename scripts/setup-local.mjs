import { existsSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
if (existsSync('.env')) {
  console.log('.env bestaat al en is behouden. De lokale instellingen staan klaar.')
} else {
  const password = randomBytes(24).toString('hex')
  const secret = randomBytes(32).toString('hex')
  writeFileSync(
    '.env',
    `DATABASE_URL=postgresql://familieboom:${password}@127.0.0.1:54329/familieboom\nPOSTGRES_PASSWORD=${password}\nPAYLOAD_SECRET=${secret}\nNEXT_PUBLIC_SERVER_URL=http://localhost:3000\n`,
    { mode: 0o600, flag: 'wx' },
  )
  console.log(
    'Lokale instellingen aangemaakt met willekeurige geheime sleutels. Er is geen beheeraccount aangemaakt.',
  )
}
