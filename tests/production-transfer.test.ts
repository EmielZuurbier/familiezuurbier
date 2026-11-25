import { describe, expect, it } from 'vitest'
import { defaultSiteSettings } from '../src/lib/site-settings'
import {
  transferTables,
  type TransferRows,
  type Row,
  type Column,
  prepareRows,
  validateConnections,
  safeFilename,
  imageKey,
  digest,
  assertEmptyTarget,
  assertSchema,
  assertWebsiteIdentity,
} from '../scripts/lib/production-transfer'

const empty = () =>
  Object.fromEntries(transferTables.map((table) => [table, []])) as unknown as TransferRows
function settingsColumns(input: Row, prefix = ''): Row {
  return Object.assign(
    {},
    ...Object.entries(input).map(([name, value]) => {
      const key = prefix + name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
      return value && typeof value === 'object'
        ? settingsColumns(value as Row, key + '_')
        : { [key]: value }
    }),
  )
}
const defaults = () => ({
  ...settingsColumns(defaultSiteSettings),
  identity_logo_id: null,
  identity_icon_id: null,
})

describe('Eenmalige overdracht naar productie', () => {
  it('staat alleen de lokale bron en een directe Neon-verbinding met TLS toe', () => {
    const source = 'postgresql://fictief:fictief@127.0.0.1:54329/familieboom'
    const target =
      'postgresql://fictief:fictief@ep-check.eu-central-1.aws.neon.tech/db?sslmode=require'
    expect(() => validateConnections(source, target)).not.toThrow()
    for (const value of [
      source,
      target.replace('sslmode=require', 'sslmode=disable'),
      target.replace('ep-check.', 'ep-check-pooler.'),
      target.replace('.neon.tech', '.example.test'),
    ])
      expect(() => validateConnections(source, value)).toThrow()
    expect(() => validateConnections(target, target)).toThrow()
  })

  it('weigert padtraversal en behoudt geldige objectmappen', () => {
    for (const filename of [
      '../foto.webp',
      'a/b.webp',
      '..',
      'a\\b.jpg',
      'foto.jpg?x',
      'foto\u0000.jpg',
    ])
      expect(() => safeFilename(filename)).toThrow()
    expect(
      imageKey('family-media', { prefix: 'jaar/2026', _objectkey: 'portretten' }, 'één foto.webp'),
    ).toBe('family-media/jaar/2026/portretten/één foto.webp')
    expect(() => imageKey('family-media', { prefix: '../ander' }, 'foto.webp')).toThrow()
  })

  it('behoudt wachtwoordhashes en koppelingen en maakt tijdelijke toegang ongeldig zonder de bron te wijzigen', () => {
    const raw = empty()
    raw.administrators = [
      {
        id: 7,
        hash: 'fictieve-hash',
        salt: 'fictief-zout',
        reset_password_token: 'oud',
        reset_password_expiration: new Date(),
        reset_password_requested_at: new Date(),
        login_attempts: '4',
        lock_until: new Date(),
      },
    ]
    raw.family_members = [
      {
        id: 13,
        status: 'active',
        auth_version: '2',
        code_attempts: '1',
        invite_hash: 'oud',
        code_hash: 'oud',
        mail_failed: false,
      },
    ]
    raw.media = [
      {
        id: 9,
        filename: 'foto.webp',
        url: 'http://localhost/foto.webp',
        sizes_avatar_filename: 'foto-160x160.webp',
        sizes_avatar_url: 'http://localhost/avatar.webp',
      },
    ]
    raw.people = [{ id: 42, name: 'Fictief persoon', photo_id: 9 }]
    raw.partnerships_rels = [{ id: 88, order: 2, parent_id: 6, path: 'children', people_id: 42 }]
    const before = digest(raw),
      result = prepareRows(raw)
    expect(digest(raw)).toBe(before)
    expect(result.administrators[0]).toMatchObject({
      id: 7,
      hash: 'fictieve-hash',
      salt: 'fictief-zout',
      login_attempts: '0',
      reset_password_token: null,
      reset_password_requested_at: null,
      lock_until: null,
    })
    expect(result.family_members[0]).toMatchObject({
      id: 13,
      status: 'active',
      auth_version: '3',
      code_attempts: '0',
      invite_hash: null,
      code_hash: null,
    })
    expect(result.media[0]).toMatchObject({
      url: '/api/media/file/foto.webp',
      sizes_avatar_url: '/api/media/file/foto-160x160.webp',
      thumbnail_u_r_l: '/api/media/file/foto-160x160.webp',
    })
    expect(result.people).toEqual(raw.people)
    expect(result.partnerships_rels).toEqual(raw.partnerships_rels)
    raw.administrators[0].hash = null
    expect(() => prepareRows(raw)).toThrow()
  })

  it('laat alleen een lege database met ongewijzigde standaardinstellingen toe', () => {
    const rows = empty()
    rows.site_settings = [defaults()]
    expect(() => assertEmptyTarget(rows)).not.toThrow()
    rows.people.push({ id: 1 })
    expect(() => assertEmptyTarget(rows)).toThrow(/overschrijft geen/)
    rows.people = []
    rows.site_settings[0].identity_name = 'Al ingericht'
    expect(() => assertEmptyTarget(rows)).toThrow(/aangepast/)
  })

  it('controleert alle tabelstructuren en de identiteit van de online database', () => {
    const columns: Column[] = transferTables.map((table_name) => ({
      table_name,
      column_name: 'id',
      udt_name: 'int4',
    }))
    expect(() => assertSchema(columns, columns)).not.toThrow()
    expect(() => assertSchema(columns, columns.slice(1))).toThrow()
    const when = new Date('2026-11-25T12:00:00.000Z')
    expect(() =>
      assertWebsiteIdentity({ id: 1, createdAt: when.toISOString() }, { id: 1, created_at: when }),
    ).not.toThrow()
    expect(() =>
      assertWebsiteIdentity(
        { id: 1, createdAt: new Date(0).toISOString() },
        { id: 1, created_at: when },
      ),
    ).toThrow()
  })
})
