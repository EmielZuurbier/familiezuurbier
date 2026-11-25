import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import pg from 'pg'
import type { Payload } from 'payload'
import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import {
  transferTables,
  type TransferRows,
  prepareRows,
  readRows,
  writeRows,
  assertEmptyTarget,
  assertSchema,
  schema,
  digest,
} from '../scripts/lib/production-transfer'

// Opt in only on the disposable database. Never read the real .env for these tests.
describe.skipIf(!process.env.TRANSFER_CHECK_DATABASE_URL)(
  'Overdracht met echte PostgreSQL-tabellen',
  () => {
    let db: pg.Client, payload: Payload, fixture: TransferRows
    const password = randomBytes(24).toString('hex')
    beforeAll(async () => {
      const url = new URL(process.env.TRANSFER_CHECK_DATABASE_URL!)
      if (
        url.hostname !== '127.0.0.1' ||
        url.port !== '54330' ||
        url.pathname !== '/transfer_check'
      )
        throw new Error('Gebruik uitsluitend de tijdelijke overdrachtstestdatabase.')
      vi.stubEnv('DATABASE_URL', url.toString())
      vi.stubEnv('PAYLOAD_SECRET', randomBytes(32).toString('hex'))
      vi.stubEnv('BLOB_READ_WRITE_TOKEN', '')
      vi.stubEnv('VERCEL', '')
      const { postgresAdapter } = await import('@payloadcms/db-postgres')
      const { getPayload } = await import('payload')
      const { default: configPromise } = await import('../src/payload.config')
      const config = await configPromise
      config.db = {
        ...postgresAdapter({ pool: { connectionString: url.toString() }, push: false }),
        allowIDOnCreate: false,
        name: 'postgres',
      }
      payload = await getPayload({ config })
      const { migrations } = await import('../src/migrations')
      await payload.db.migrate({
        migrations: migrations.map((migration) => ({
          name: migration.name,
          up: (args: unknown) => migration.up(args as MigrateUpArgs),
          down: (args: unknown) => migration.down(args as MigrateDownArgs),
        })),
      })
      db = new pg.Client({ connectionString: url.toString() })
      await db.connect()
      assertEmptyTarget(await readRows(db))
      const admin = await payload.create({
        collection: 'administrators',
        data: { email: 'overdracht@example.test', name: 'Fictieve beheerder', password },
        overrideAccess: true,
        context: { bootstrapAdministrator: true },
      })
      await db.query('UPDATE administrators SET id=17 WHERE id=$1', [admin.id])
      await db.query(`
      INSERT INTO media (id,filename,mime_type,sizes_avatar_filename) VALUES (21,'fictief.webp','image/webp','fictief-160x160.webp');
      INSERT INTO brand_assets (id,filename,mime_type) VALUES (22,'logo.webp','image/webp');
      INSERT INTO people (id,name,photo_id,avatar_photo_id,birth_year) VALUES (31,'Fictieve ouder A',21,21,1970),(32,'Fictieve ouder B',NULL,NULL,1972),(33,'Fictief kind',NULL,NULL,2000);
      INSERT INTO partnerships (id,person_a_id,person_b_id,title,pair_key) VALUES (41,31,32,'Fictief gezin','31:32');
      INSERT INTO partnerships_rels (id,"order",parent_id,path,people_id) VALUES (51,1,41,'children',33);
      INSERT INTO parentages (id,parent_id,child_id,pair_key) VALUES (52,31,33,'31:33');
      INSERT INTO events (id,title,cover_id,story) VALUES (61,'Fictief verhaal',21,'{"version":1,"blocks":[{"name":"core/image","attributes":{"id":21}}]}');
      INSERT INTO events_rels (id,"order",parent_id,path,people_id,media_id) VALUES (71,1,61,'relatedPeople',33,NULL),(72,1,61,'mediaReferences',NULL,21);
      INSERT INTO family_members (id,name,email,status,auth_version,code_hash,invite_hash) VALUES (81,'Fictieve kijker','kijker@example.test','active',2,'fictief','fictief');
      UPDATE site_settings SET identity_name='Fictieve familie',identity_logo_id=22;
    `)
      fixture = prepareRows(await readRows(db))
      // Remove fixtures from this disposable database; the original migration defaults return.
      await db.query(
        `TRUNCATE ${transferTables.map((table) => `public."${table}"`).join(',')} RESTART IDENTITY CASCADE`,
      )
      await db.query('INSERT INTO site_settings DEFAULT VALUES')
      assertSchema(await schema(db), await schema(db))
      assertEmptyTarget(await readRows(db))
    }, 60000)
    afterAll(async () => {
      await db?.end()
      await payload?.destroy()
      vi.unstubAllEnvs()
    })

    it('draait gegevens én ID-volgordes terug als de transactie wordt afgebroken', async () => {
      const before = await readRows(db)
      const sequences = (
        await db.query(
          'SELECT sequencename,last_value FROM pg_sequences WHERE schemaname=$1 ORDER BY sequencename',
          ['public'],
        )
      ).rows
      await db.query('BEGIN')
      try {
        await writeRows(db, fixture)
      } finally {
        await db.query('ROLLBACK')
      }
      expect(digest(await readRows(db))).toBe(digest(before))
      expect(
        (
          await db.query(
            'SELECT sequencename,last_value FROM pg_sequences WHERE schemaname=$1 ORDER BY sequencename',
            ['public'],
          )
        ).rows,
      ).toEqual(sequences)
    })

    it('behoudt IDs, JSON-verhalen, fotoverwijzingen, kindvolgorde en het bestaande beheerderswachtwoord', async () => {
      await db.query('BEGIN')
      try {
        await writeRows(db, fixture)
        await db.query('COMMIT')
      } catch (error) {
        await db.query('ROLLBACK')
        throw error
      }
      expect(digest(await readRows(db))).toBe(digest(fixture))
      expect(() => assertEmptyTarget(fixture)).toThrow()
      const login = await payload.login({
        collection: 'administrators',
        data: { email: 'overdracht@example.test', password },
      })
      expect(login.user?.id).toBe(17)
      expect(login.token).toBeTruthy()
      const child = (
        await db.query("INSERT INTO people(name) VALUES ('Volgende fictieve persoon') RETURNING id")
      ).rows[0]
      expect(child.id).toBe(34)
      const rel = (
        await db.query(
          'INSERT INTO partnerships_rels(parent_id,path,people_id,"order") VALUES (41,\'children\',34,2) RETURNING id',
        )
      ).rows[0]
      expect(rel.id).toBe(52)
      expect(
        (await db.query('SELECT COUNT(*)::int AS count FROM payload_migrations')).rows[0].count,
      ).toBe(11)
    })
  },
)
