import { createHash } from 'node:crypto'
import type { Client } from 'pg'
import { defaultSiteSettings } from '../../src/lib/site-settings'

// Dependency order preserves every original ID and all photo/person/story relationships.
export const transferTables = [
  'administrators',
  'media',
  'brand_assets',
  'people',
  'partnerships',
  'partnerships_rels',
  'parentages',
  'events',
  'events_rels',
  'family_members',
  'site_settings',
] as const
export type TransferTable = (typeof transferTables)[number]
export type Row = Record<string, unknown>
export type TransferRows = Record<TransferTable, Row[]>
export type Column = { table_name: string; column_name: string; udt_name: string }
export class TransferError extends Error {}
export function requireTransfer(condition: unknown, message: string): asserts condition {
  if (!condition) throw new TransferError(message)
}
export const quote = (name: string) => `"${name.replaceAll('"', '""')}"`
export function canonical(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString())
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`
  return JSON.stringify(value) ?? 'null'
}
export const digest = (value: unknown) =>
  createHash('sha256').update(canonical(value)).digest('hex')
export const bytesDigest = (value: Buffer) => createHash('sha256').update(value).digest('hex')

export function validateConnections(sourceValue: string, targetValue: string) {
  const source = new URL(sourceValue),
    target = new URL(targetValue)
  requireTransfer(
    ['postgres:', 'postgresql:'].includes(source.protocol) &&
      ['127.0.0.1', 'localhost'].includes(source.hostname) &&
      source.port === '54329' &&
      source.pathname === '/familieboom',
    'De bron moet de bestaande lokale familiedatabase zijn.',
  )
  requireTransfer(
    ['postgres:', 'postgresql:'].includes(target.protocol) &&
      target.hostname.endsWith('.neon.tech') &&
      !target.hostname.includes('-pooler.'),
    'Gebruik de directe Neon-verbinding als doel, niet de pooler of een lokale database.',
  )
  requireTransfer(
    ['require', 'verify-full', 'verify-ca'].includes(target.searchParams.get('sslmode') ?? ''),
    'De Neon-verbinding moet TLS gebruiken (sslmode=require).',
  )
  requireTransfer(source.toString() !== target.toString(), 'Bron en doel mogen nooit gelijk zijn.')
}

export function safeFilename(value: unknown): string {
  requireTransfer(
    typeof value === 'string' &&
      !!value &&
      value !== '.' &&
      value !== '..' &&
      !/[\\/\x00-\x1f?#]/.test(value),
    'Er is een ongeldig afbeeldingspad gevonden; de overdracht is gestopt.',
  )
  return value
}
export function imageKey(folder: string, row: Row, filename: string) {
  const parts = [row.prefix, row._objectkey].filter(
    (part) => part !== null && part !== undefined && part !== '',
  )
  for (const part of parts)
    requireTransfer(
      typeof part === 'string' &&
        !/[\\\x00-\x1f?#]/.test(part) &&
        part.split('/').every((p) => p && p !== '.' && p !== '..'),
      'Een opgeslagen objectmap is ongeldig.',
    )
  return [folder, ...parts, safeFilename(filename)].join('/')
}

export function prepareRows(raw: TransferRows): TransferRows {
  const rows = structuredClone(raw)
  for (const admin of rows.administrators) {
    requireTransfer(
      typeof admin.hash === 'string' &&
        !!admin.hash &&
        typeof admin.salt === 'string' &&
        !!admin.salt,
      'Een beheerder heeft geen compleet opgeslagen wachtwoord. Controleer de lokale accounts.',
    )
    for (const field of [
      'reset_password_token',
      'reset_password_expiration',
      'reset_password_requested_at',
      'lock_until',
    ])
      admin[field] = null
    // pg represents numeric columns as strings; keep snapshots equal to read-back rows.
    admin.login_attempts = '0'
  }
  for (const member of rows.family_members) {
    for (const field of [
      'invite_hash',
      'invite_expires_at',
      'code_hash',
      'code_expires_at',
      'code_sent_at',
    ])
      member[field] = null
    member.code_attempts = '0'
    member.auth_version = String(Number(member.auth_version ?? 0) + 1)
  }
  for (const table of ['media', 'brand_assets'] as const)
    for (const row of rows[table]) {
      const file = safeFilename(row.filename)
      row.url = `/api/${table === 'media' ? 'media' : 'brand-assets'}/file/${encodeURIComponent(file)}`
      const avatar = row.sizes_avatar_filename ? safeFilename(row.sizes_avatar_filename) : null
      if (avatar) row.sizes_avatar_url = `/api/media/file/${encodeURIComponent(avatar)}`
      row.thumbnail_u_r_l = avatar ? row.sizes_avatar_url : row.url
    }
  return rows
}

export async function readRows(db: Client): Promise<TransferRows> {
  const rows = {} as TransferRows
  for (const table of transferTables)
    rows[table] = (await db.query(`SELECT * FROM public.${quote(table)} ORDER BY id`)).rows
  return rows
}
export async function schema(db: Client): Promise<Column[]> {
  return (
    await db.query<Column>(
      'SELECT table_name,column_name,udt_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=ANY($2) ORDER BY table_name,ordinal_position',
      ['public', [...transferTables]],
    )
  ).rows
}
export function assertSchema(source: Column[], target: Column[]) {
  for (const table of transferTables) {
    const a = source
      .filter((c) => c.table_name === table)
      .map((c) => [c.column_name, c.udt_name])
      .sort()
    const b = target
      .filter((c) => c.table_name === table)
      .map((c) => [c.column_name, c.udt_name])
      .sort()
    requireTransfer(
      a.length && canonical(a) === canonical(b),
      `De structuur van ${table} verschilt. Werk eerst de productiemigraties bij; er wordt niets geïmporteerd.`,
    )
  }
}

function defaultSettingsColumns(value: Record<string, unknown>, prefix = ''): Row {
  return Object.assign(
    {},
    ...Object.entries(value).map(([key, value]) => {
      const name = `${prefix}${key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}`
      return value && typeof value === 'object'
        ? defaultSettingsColumns(value as Row, `${name}_`)
        : { [name]: value }
    }),
  )
}
export function assertEmptyTarget(rows: TransferRows) {
  for (const table of transferTables.filter((t) => t !== 'site_settings'))
    requireTransfer(
      rows[table].length === 0,
      `De online tabel ${table} bevat al ${rows[table].length} item(s). De overdracht overschrijft geen bestaande online gegevens.`,
    )
  requireTransfer(
    rows.site_settings.length === 1,
    'De online website-instellingen moeten de ene standaardinstelling uit de migratie bevatten.',
  )
  const expected = {
    ...defaultSettingsColumns(defaultSiteSettings),
    identity_logo_id: null,
    identity_icon_id: null,
  }
  const actual = rows.site_settings[0]
  requireTransfer(
    Object.entries(expected).every(([key, value]) => canonical(actual[key]) === canonical(value)),
    'De online website-instellingen zijn aangepast. Die worden niet zonder meer overschreven.',
  )
}
export function assertWebsiteIdentity(settings: unknown, row: Row) {
  const doc = settings as { id?: unknown; createdAt?: unknown } | null
  requireTransfer(
    doc &&
      String(doc.id) === String(row.id) &&
      canonical(doc.createdAt) === canonical(row.created_at),
    'De website hoort niet aantoonbaar bij de opgegeven database. Controleer de Neon-verbinding.',
  )
}

export async function writeRows(db: Client, rows: TransferRows) {
  // Only the verified, untouched default settings record is replaced.
  await db.query('DELETE FROM public.site_settings')
  for (const table of transferTables) {
    for (const row of rows[table]) {
      const columns = Object.keys(row)
      await db.query(
        `INSERT INTO public.${quote(table)} (${columns.map(quote).join(',')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(',')})`,
        columns.map((key) => row[key]),
      )
    }
    const result = await db.query<{ sequence: string | null }>(
      'SELECT pg_get_serial_sequence($1,$2) AS sequence',
      [`public.${table}`, 'id'],
    )
    const sequence = result.rows[0].sequence
    if (sequence) {
      const next = Math.max(0, ...rows[table].map((row) => Number(row.id))) + 1
      requireTransfer(
        Number.isSafeInteger(next),
        'Een ID-volgorde kan niet veilig worden hersteld.',
      )
      const parts = sequence.split('.')
      requireTransfer(
        parts.length === 2 && parts.every((p) => /^[a-z_][a-z0-9_]*$/.test(p)),
        'Een databasevolgorde heeft een onverwachte naam.',
      )
      // ALTER SEQUENCE is transactional; unlike setval it also rolls back on failure.
      await db.query(`ALTER SEQUENCE ${parts.map(quote).join('.')} RESTART WITH ${next}`)
    }
  }
  const actual = await readRows(db)
  for (const table of transferTables)
    requireTransfer(
      digest(actual[table]) === digest(rows[table]),
      `De nacontrole van ${table} is niet gelijk. De transactie wordt teruggedraaid.`,
    )
}
