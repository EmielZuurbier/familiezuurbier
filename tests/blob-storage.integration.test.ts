import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import type { Payload, SanitizedConfig } from 'payload'
import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { cookieName, secretHash } from '../src/lib/family-auth/primitives'

const storage = vi.hoisted(() => ({
  objects: new Map<string, Buffer>(),
  writes: [] as string[],
  reads: [] as string[],
}))
vi.mock('@vercel/blob', () => ({
  put: async (key: string, buffer: Buffer, options: { access: string }) => {
    if (options.access !== 'private')
      throw new Error('Alleen privé-opslag toegestaan in deze proef.')
    storage.objects.set(key, Buffer.from(buffer))
    storage.writes.push(key)
  },
  get: async (key: string) => {
    storage.reads.push(key)
    const data = storage.objects.get(key)
    return data
      ? {
          statusCode: 200,
          blob: { contentType: 'image/webp', size: data.length },
          stream: new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(data))
              controller.close()
            },
          }),
        }
      : null
  },
  del: async (key: string) => {
    storage.objects.delete(key)
  },
}))

// Explicitly opt in with an isolated disposable database. Never use DATABASE_URL from .env.
describe.skipIf(!process.env.BLOB_CHECK_DATABASE_URL)(
  'Blob-koppeling met PostgreSQL en de echte bestandsroutes',
  () => {
    let payload: Payload, config: SanitizedConfig, adminCookie: string
    let mediaID: number, filename: string, avatar: string
    let request: (path: string, cookie?: string) => Promise<Response>
    beforeAll(async () => {
      const database = new URL(process.env.BLOB_CHECK_DATABASE_URL!)
      if (
        database.hostname !== '127.0.0.1' ||
        database.port !== '54330' ||
        database.pathname !== '/blob_check'
      )
        throw new Error('Gebruik uitsluitend de tijdelijke Blob-testdatabase.')
      vi.stubEnv('DATABASE_URL', database.toString())
      vi.stubEnv('PAYLOAD_SECRET', randomBytes(32).toString('hex'))
      vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_fictief_alleen_een_test')
      vi.stubEnv('VERCEL', '1')
      const { postgresAdapter } = await import('@payloadcms/db-postgres')
      const { getPayload, handleEndpoints } = await import('payload')
      const { default: configPromise } = await import('../src/payload.config')
      config = await configPromise
      config.db = {
        ...postgresAdapter({ pool: { connectionString: database.toString() }, push: false }),
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
      request = (path, cookie) =>
        handleEndpoints({
          config,
          request: new Request(`http://127.0.0.1:3000${path}`, {
            headers: cookie ? { cookie } : {},
          }),
        })
      const password = randomBytes(24).toString('hex')
      const account = await payload.create({
        collection: 'administrators',
        data: {
          email: `blob-${randomBytes(5).toString('hex')}@example.test`,
          name: 'Fictieve opslagbeheerder',
          password,
        },
        overrideAccess: true,
        context: { bootstrapAdministrator: true },
      })
      const login = await payload.login({
        collection: 'administrators',
        data: { email: account.email, password },
      })
      adminCookie = `${payload.config.cookiePrefix}-token=${login.token}`
    }, 60000)
    afterAll(async () => {
      await payload?.destroy()
      vi.unstubAllEnvs()
    })

    it('slaat de verwerkte foto en avatar privé op en bedient beide via Payload', async () => {
      const sharp = (await import('sharp')).default
      const buffer = await sharp({
        create: { width: 500, height: 350, channels: 3, background: '#345d49' },
      })
        .withExif({ IFD0: { Artist: 'Fictieve metadata' } })
        .jpeg()
        .toBuffer()
      const doc = await payload.create({
        collection: 'media',
        data: { alt: 'Fictieve kleurproef' },
        file: {
          data: buffer,
          name: 'fictieve-foto.jpg',
          mimetype: 'image/jpeg',
          size: buffer.length,
        },
        overrideAccess: true,
      })
      mediaID = doc.id
      filename = doc.filename!
      avatar = doc.sizes!.avatar!.filename!
      expect(storage.writes).toContain(`family-media/${filename}`)
      expect(storage.writes).toContain(`family-media/${avatar}`)
      for (const name of [filename, avatar]) {
        const response = await request(`/api/media/file/${name}`, adminCookie)
        expect(response.status).toBe(200)
        expect(response.headers.get('cache-control')).toContain('no-store')
        const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata()
        expect(metadata.format).toBe('webp')
        expect(metadata.exif).toBeUndefined()
        expect((await request(`/api/media/file/${name}`)).status).toBe(403)
      }
      expect(doc.url).toContain('/api/media/file/')
      expect(doc.url).not.toContain('blob.vercel-storage.com')
      await payload.update({
        collection: 'media',
        id: doc.id,
        data: { alt: 'Alleen de beschrijving gewijzigd' },
        overrideAccess: true,
      })
      expect(storage.writes).toHaveLength(2)
    })
    it('trekt ook bestaande bestandslinks onmiddellijk in wanneer familietoegang wordt ingetrokken', async () => {
      const member = await payload.create({
        collection: 'family-members',
        data: {
          name: 'Fictieve kijker',
          email: `kijker-${randomBytes(5).toString('hex')}@example.test`,
          status: 'active',
          authVersion: 1,
        },
        overrideAccess: true,
      })
      const token = randomBytes(32).toString('base64url')
      await payload.create({
        collection: 'family-sessions',
        data: {
          member: member.id,
          tokenHash: secretHash(payload.secret, 'session', token),
          authVersion: 1,
          expiresAt: new Date(Date.now() + 60000).toISOString(),
        },
        overrideAccess: true,
      })
      const cookie = `${cookieName(payload.config.cookiePrefix)}=${token}`
      expect((await request(`/api/media/file/${filename}`, cookie)).status).toBe(200)
      const reads = storage.reads.length
      await payload.update({
        collection: 'family-members',
        id: member.id,
        data: { status: 'revoked', authVersion: 2 },
        overrideAccess: true,
      })
      expect((await request(`/api/media/file/${filename}`, cookie)).status).toBe(403)
      expect((await request(`/api/media/file/${avatar}`, cookie)).status).toBe(403)
      expect(storage.reads).toHaveLength(reads)
    })
    it('toont een logo openbaar via Payload en weigert ontbrekende bestanden', async () => {
      const bytes = storage.objects.get(`family-media/${filename}`)!
      const logo = await payload.create({
        collection: 'brand-assets',
        data: { alt: 'Fictief logo' },
        file: { data: bytes, name: 'logo.webp', mimetype: 'image/webp', size: bytes.length },
        overrideAccess: true,
      })
      expect(storage.objects.has(`brand-assets/${logo.filename}`)).toBe(true)
      expect((await request(`/api/brand-assets/file/${logo.filename}`)).status).toBe(200)
      expect((await request('/api/brand-assets/file/ontbreekt.webp')).status).toBe(404)
      await payload.delete({ collection: 'brand-assets', id: logo.id, overrideAccess: true })
      expect(storage.objects.has(`brand-assets/${logo.filename}`)).toBe(false)
    })
    it('handhaaft de 4 MB-grens in echte multipart-verzoeken', async () => {
      const { handleEndpoints } = await import('payload')
      const body = new FormData()
      body.set(
        'file',
        new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'te-groot.jpg', { type: 'image/jpeg' }),
      )
      const response = await handleEndpoints({
        config,
        request: new Request('http://127.0.0.1:3000/api/media', {
          method: 'POST',
          headers: { cookie: adminCookie },
          body,
        }),
      })
      expect(response.status).toBe(413)
    })
    it('verwijdert het origineel en de avatar uit de opslag wanneer de afbeelding wordt verwijderd', async () => {
      await payload.delete({ collection: 'media', id: mediaID, overrideAccess: true })
      expect(storage.objects.has(`family-media/${filename}`)).toBe(false)
      expect(storage.objects.has(`family-media/${avatar}`)).toBe(false)
    })
  },
)
