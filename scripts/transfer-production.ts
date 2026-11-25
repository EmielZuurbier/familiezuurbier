import { mkdir, readFile, writeFile, realpath, stat, chmod } from 'node:fs/promises'
import path from 'node:path'
import { parseEnv } from 'node:util'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import pg from 'pg'
import sharp from 'sharp'
import { put, get, del, list } from '@vercel/blob'
import {
  transferTables,
  readRows,
  prepareRows,
  schema,
  assertSchema,
  assertEmptyTarget,
  assertWebsiteIdentity,
  writeRows,
  digest,
  bytesDigest,
  imageKey,
  safeFilename,
  requireTransfer,
  TransferError,
  quote,
  validateConnections as validateOnline,
  type TransferRows,
  type Column,
} from './lib/production-transfer'

type ImageFile = {
  key: string
  filename: string
  table: 'media' | 'brand_assets'
  size: number
  sha256: string
  contentType: string
}
type Snapshot = {
  version: 1
  createdAt: string
  sourceDigest: string
  columns: Column[]
  rows: TransferRows
  files: ImageFile[]
}
const root = process.cwd(),
  backups = path.join(root, 'backups')
const options = process.argv.slice(2)
const mode =
  options.find((arg) => ['--prepare', '--plan', '--apply', '--verify'].includes(arg)) ?? '--plan'
const snapshotIndex = options.indexOf('--snapshot')
let directory = snapshotIndex >= 0 ? path.resolve(options[snapshotIndex + 1] ?? '') : ''
let privateDirectoryReady = false
let target: pg.Client | undefined
let transaction = false,
  commitStarted = false,
  committed = false
const uploaded: string[] = []
let blobToken = ''

async function jsonFile(filename: string, value: unknown) {
  await writeFile(filename, JSON.stringify(value, null, 2), { mode: 0o600 })
}
async function readSource(sourceURL: string) {
  const client = new pg.Client({
    connectionString: sourceURL,
    connectionTimeoutMillis: 15000,
    query_timeout: 30000,
  })
  await client.connect()
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  try {
    const rows = await readRows(client),
      columns = await schema(client)
    await client.query('COMMIT')
    return { rows, columns }
  } finally {
    await client.end()
  }
}
async function prepare(
  sourceURL: string,
  local: Record<string, string | undefined>,
): Promise<Snapshot> {
  const { rows, columns } = await readSource(sourceURL)
  requireTransfer(
    rows.people.length > 0 && rows.administrators.length > 0,
    'De lokale bron bevat geen complete familie met beheerder. Er wordt niets overgezet.',
  )
  await mkdir(backups, { recursive: true, mode: 0o700 })
  directory = await realpath(backups).then((base) =>
    path.join(
      base,
      `overdracht-${new Date().toISOString().replaceAll(':', '-')}-${randomBytes(3).toString('hex')}`,
    ),
  )
  await mkdir(directory, { mode: 0o700 })
  privateDirectoryReady = true
  const snapshot: Snapshot = {
    version: 1,
    createdAt: new Date().toISOString(),
    sourceDigest: digest(rows),
    columns,
    rows: prepareRows(rows),
    files: [],
  }
  for (const table of ['media', 'brand_assets'] as const) {
    const base = await realpath(
      path.resolve(
        table === 'media'
          ? local.FAMILY_MEDIA_DIR || 'uploads/family-media'
          : local.BRAND_ASSETS_DIR || 'uploads/brand-assets',
      ),
    ).catch(() => null)
    requireTransfer(base || rows[table].length === 0, 'Een lokale afbeeldingenmap ontbreekt.')
    for (const row of rows[table]) {
      const names = [
        safeFilename(row.filename),
        ...(row.sizes_avatar_filename ? [safeFilename(row.sizes_avatar_filename)] : []),
      ]
      for (const filename of names) {
        const original = await realpath(path.join(base!, filename))
        requireTransfer(
          original.startsWith(base! + path.sep) && (await stat(original)).isFile(),
          'Een afbeeldingsbestand valt buiten de verwachte lokale map.',
        )
        const buffer = await readFile(original),
          metadata = await sharp(buffer).metadata()
        requireTransfer(
          metadata.format && ['jpeg', 'png', 'webp'].includes(metadata.format),
          'Een bestand is geen ondersteunde afbeelding.',
        )
        const key = imageKey(table === 'media' ? 'family-media' : 'brand-assets', row, filename)
        requireTransfer(
          !snapshot.files.some((file) => file.key === key),
          'Twee afbeeldingsverwijzingen gebruiken hetzelfde opslagpad.',
        )
        const destination = path.join(directory, 'files', key)
        await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 })
        await writeFile(destination, buffer, { mode: 0o600, flag: 'wx' })
        snapshot.files.push({
          key,
          filename,
          table,
          size: buffer.length,
          sha256: bytesDigest(buffer),
          contentType: `image/${metadata.format}`,
        })
      }
    }
  }
  await jsonFile(path.join(directory, 'snapshot.json'), snapshot)
  await jsonFile(path.join(directory, 'overzicht.json'), {
    createdAt: snapshot.createdAt,
    counts: Object.fromEntries(transferTables.map((t) => [t, snapshot.rows[t].length])),
    files: snapshot.files.length,
    bytes: snapshot.files.reduce((n, f) => n + f.size, 0),
    sessionsCopied: false,
    sourceDigest: snapshot.sourceDigest,
  })
  return snapshot
}

async function existingSnapshot(): Promise<Snapshot> {
  const base = await realpath(backups),
    actual = await realpath(directory)
  requireTransfer(
    actual.startsWith(base + path.sep) && path.basename(actual).startsWith('overdracht-'),
    'Gebruik alleen een overdrachtskopie binnen backups/.',
  )
  directory = actual
  privateDirectoryReady = true
  const value = JSON.parse(
    await readFile(path.join(directory, 'snapshot.json'), 'utf8'),
  ) as Snapshot
  requireTransfer(
    value.version === 1 && !!value.sourceDigest && Array.isArray(value.files),
    'De overdrachtskopie heeft een onbekend formaat.',
  )
  return value
}
async function verifySource(snapshot: Snapshot, sourceURL: string) {
  const current = await readSource(sourceURL)
  requireTransfer(
    digest(current.rows) === snapshot.sourceDigest &&
      digest(prepareRows(current.rows)) === digest(snapshot.rows),
    'De lokale gegevens zijn sinds het voorbereiden veranderd. Maak eerst een nieuwe overdrachtskopie.',
  )
}
async function verifyFiles(snapshot: Snapshot, remote = false) {
  for (const file of snapshot.files) {
    // Reconstruct every key from the stored image record rather than trusting archive paths.
    const row = snapshot.rows[file.table]?.find(
      (row) => row.filename === file.filename || row.sizes_avatar_filename === file.filename,
    )
    requireTransfer(
      row &&
        imageKey(file.table === 'media' ? 'family-media' : 'brand-assets', row, file.filename) ===
          file.key,
      'Een bestandspad in de overdrachtskopie klopt niet.',
    )
    let bytes: Buffer
    if (remote) {
      const result = await get(file.key, { access: 'private', token: blobToken, useCache: false })
      requireTransfer(
        result?.statusCode === 200 &&
          new URL(result.blob.url).hostname.endsWith('.private.blob.vercel-storage.com'),
        'Een online afbeelding ontbreekt of staat niet privé.',
      )
      bytes = Buffer.from(await new Response(result.stream).arrayBuffer())
    } else {
      const stored = await realpath(path.join(directory, 'files', file.key))
      requireTransfer(
        stored.startsWith(directory + path.sep),
        'Een bestand valt buiten de overdrachtskopie.',
      )
      bytes = await readFile(stored)
    }
    requireTransfer(
      bytes.length === file.size && bytesDigest(bytes) === file.sha256,
      'De inhoud van een afbeelding komt niet overeen met de controlekopie.',
    )
  }
}
async function verifyWebsite(site: URL, row: Record<string, unknown>) {
  const response = await fetch(new URL('/api/globals/site-settings?depth=0', site), {
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  })
  requireTransfer(response.ok, 'De website-instellingen zijn online nog niet bereikbaar.')
  assertWebsiteIdentity(await response.json(), row)
}
async function verifyTarget(snapshot: Snapshot) {
  const actual = await readRows(target!)
  for (const table of transferTables)
    requireTransfer(
      digest(actual[table]) === digest(snapshot.rows[table]),
      `De online inhoud van ${table} wijkt af van de overdrachtskopie.`,
    )
  await verifyFiles(snapshot, true)
}

async function main() {
  const flags = options.filter((arg) =>
    ['--prepare', '--plan', '--apply', '--verify'].includes(arg),
  )
  requireTransfer(
    flags.length <= 1 &&
      options.every(
        (arg, index) =>
          flags.includes(arg) || arg === '--snapshot' || options[index - 1] === '--snapshot',
      ),
    'Gebruik één opdracht: --prepare, --plan, --apply of --verify, eventueel met --snapshot <map>.',
  )
  requireTransfer(
    !['--apply', '--verify'].includes(mode) || snapshotIndex >= 0,
    'Gebruik voor overzetten en nacontrole de bestaande controlekopie via --snapshot <map>.',
  )
  requireTransfer(
    snapshotIndex < 0 ||
      (!!options[snapshotIndex + 1] && !options[snapshotIndex + 1].startsWith('--')),
    'Geef de map met de controlekopie op na --snapshot.',
  )
  const local = parseEnv(await readFile(path.join(root, '.env'), 'utf8'))
  requireTransfer(local.DATABASE_URL, 'De lokale DATABASE_URL ontbreekt.')
  const localURL = new URL(local.DATABASE_URL)
  requireTransfer(
    ['127.0.0.1', 'localhost'].includes(localURL.hostname) &&
      localURL.port === '54329' &&
      localURL.pathname === '/familieboom',
    'Gebruik uitsluitend de bestaande lokale familiedatabase als bron.',
  )
  const snapshot = directory ? await existingSnapshot() : await prepare(local.DATABASE_URL, local)
  if (mode !== '--verify') await verifySource(snapshot, local.DATABASE_URL)
  await verifyFiles(snapshot)
  console.log(`Controlekopie: ${path.relative(root, directory)}`)
  console.log(
    `Klaar: ${snapshot.rows.people.length} personen, ${snapshot.rows.partnerships.length} partnerschappen, ${snapshot.rows.events.length} gebeurtenis(sen), ${snapshot.rows.administrators.length} beheerders en ${snapshot.files.length} afbeeldingsbestanden inclusief avatars.`,
  )
  if (mode === '--prepare') {
    console.log('Alleen lokaal voorbereid; online is niets gewijzigd.')
    return
  }

  const filename = path.join(root, '.env.overdracht.local')
  await chmod(filename, 0o600)
  const online = parseEnv(await readFile(filename, 'utf8'))
  requireTransfer(
    online.TRANSFER_DATABASE_URL && online.TRANSFER_BLOB_READ_WRITE_TOKEN,
    'Vul de twee online verbindingswaarden in .env.overdracht.local in. Deel ze niet in de chat.',
  )
  validateOnline(local.DATABASE_URL, online.TRANSFER_DATABASE_URL)
  blobToken = online.TRANSFER_BLOB_READ_WRITE_TOKEN.trim()
  const site = new URL(online.TRANSFER_SITE_URL || '')
  requireTransfer(
    site.protocol === 'https:' && !site.username && !site.password,
    'Gebruik het openbare HTTPS-websiteadres als TRANSFER_SITE_URL.',
  )
  target = new pg.Client({
    connectionString: online.TRANSFER_DATABASE_URL,
    connectionTimeoutMillis: 15000,
    query_timeout: 30000,
  })
  await target.connect()
  assertSchema(snapshot.columns, await schema(target))
  const history = await target.query('SELECT name FROM public.payload_migrations WHERE name=$1', [
    '20261124_155805_private_blob_storage',
  ])
  requireTransfer(
    history.rows.length === 1,
    'De laatste productiemigratie is nog niet geregistreerd. Deploy eerst de actuele applicatie.',
  )
  if (mode === '--verify') {
    await verifyTarget(snapshot)
    await verifyWebsite(site, snapshot.rows.site_settings[0])
    console.log(
      'Nacontrole geslaagd: alle overgezette rijen, koppelingen en afbeeldingsbestanden zijn gelijk aan de controlekopie.',
    )
    return
  }

  // The lock serializes all destination writes, but ordinary website reads remain possible.
  await target.query('BEGIN')
  transaction = true
  await target.query("SET LOCAL lock_timeout = '10s'")
  await target.query(
    `LOCK TABLE ${transferTables.map((t) => `public.${quote(t)}`).join(',')} IN EXCLUSIVE MODE`,
  )
  const before = await readRows(target)
  assertEmptyTarget(before)
  await verifyWebsite(site, before.site_settings[0])
  requireTransfer(
    (await list({ token: blobToken, limit: 1 })).blobs.length === 0,
    'De Blob-opslag bevat al bestanden. De overdracht overschrijft niets; controleer eerst welke bestanden daar staan.',
  )
  await jsonFile(path.join(directory, 'online-vooraf.json'), before)
  if (mode === '--plan') {
    await target.query('ROLLBACK')
    transaction = false
    console.log(
      'Plan akkoord: juiste website, compatibele database, geen online familiegegevens, standaardinstellingen en lege Blob-opslag. Er is nog niets gekopieerd.',
    )
    return
  }

  // A fresh source backup is required before the one-time import.
  const backup = spawnSync(process.execPath, ['scripts/backup.mjs'], { stdio: 'inherit' })
  requireTransfer(
    backup.status === 0,
    'De lokale herstelkopie is niet gelukt; de overdracht is gestopt.',
  )
  for (const file of snapshot.files) {
    const bytes = await readFile(path.join(directory, 'files', file.key))
    const result = await put(file.key, bytes, {
      token: blobToken,
      access: 'private',
      contentType: file.contentType,
      addRandomSuffix: false,
      allowOverwrite: false,
    })
    uploaded.push(file.key)
    requireTransfer(
      new URL(result.url).hostname.endsWith('.private.blob.vercel-storage.com'),
      'De Blob-opslag is niet privé. De overdracht is gestopt.',
    )
    await jsonFile(path.join(directory, 'voortgang.json'), { phase: 'bestanden', uploaded })
    console.log(`Afbeeldingen: ${uploaded.length}/${snapshot.files.length}.`)
  }
  await verifyFiles(snapshot, true)
  await verifySource(snapshot, local.DATABASE_URL)
  await writeRows(target, snapshot.rows)
  await jsonFile(path.join(directory, 'voortgang.json'), {
    phase: 'commit-wordt-bevestigd',
    uploaded,
  })
  commitStarted = true
  await target.query('COMMIT')
  committed = true
  transaction = false
  await verifyTarget(snapshot)
  await jsonFile(path.join(directory, 'voortgang.json'), {
    phase: 'afgerond',
    uploaded,
    verifiedAt: new Date().toISOString(),
  })
  console.log(
    'Overdracht afgerond en nagekeken. Bestaande IDs, wachtwoordhashes, familiebanden en verhalen zijn behouden; sessies en tijdelijke inlogcodes zijn niet meegenomen.',
  )
}

try {
  await main()
} catch (error) {
  if (transaction && !commitStarted) await target?.query('ROLLBACK').catch(() => {})
  if (!commitStarted && uploaded.length) {
    for (const key of uploaded) await del(key, { token: blobToken }).catch(() => {})
  }
  if (privateDirectoryReady)
    await jsonFile(path.join(directory, 'foutmelding.json'), {
      phase: committed
        ? 'nacontrole'
        : commitStarted
          ? 'commit-onzeker-bestanden-bewaard'
          : 'afgebroken',
      message: error instanceof Error ? error.message : 'Onbekende fout',
      uploaded,
    }).catch(() => {})
  console.error(
    error instanceof TransferError
      ? error.message
      : 'De overdracht is gestopt wegens een verbindings-, bestands- of databasefout. Details staan uitsluitend in de privé-controlekopie.',
  )
  if (commitStarted && !committed)
    console.error(
      'De bevestiging van de database is onzeker. De afbeeldingen zijn daarom bewaard. Voer eerst --verify uit; start niet opnieuw met importeren.',
    )
  process.exitCode = 1
} finally {
  await target?.end().catch(() => {})
}
