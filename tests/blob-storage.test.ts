import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CollectionConfig, Config, PayloadRequest } from 'payload'
const mock = vi.hoisted(() => ({ put: vi.fn(), get: vi.fn(), del: vi.fn(), find: vi.fn() }))
vi.mock('@vercel/blob', () => ({ put: mock.put, get: mock.get, del: mock.del }))
import { familyBlobStorage, privateBlobAdapter } from '../src/lib/blob-storage'
import { uploadLimit } from '../src/lib/upload-limits'

const media: CollectionConfig = {
  slug: 'media',
  fields: [],
  upload: { imageSizes: [{ name: 'avatar', width: 160, height: 160 }] },
}
const assets: CollectionConfig = { slug: 'brand-assets', fields: [], upload: true }
const token = 'vercel_blob_rw_fictief_alleen_een_test'
const request = (user?: unknown) =>
  ({ user, payload: { find: mock.find } }) as unknown as PayloadRequest
const member = { collection: 'family-members', status: 'active' }
const fileArgs = (filename = 'foto.webp') => ({ params: { collection: 'media', filename } })
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('VERCEL', '')
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', '')
  mock.find.mockResolvedValue({ docs: [{ id: 1, prefix: '', filename: 'foto.webp' }] })
  mock.get.mockImplementation(async () => ({
    statusCode: 200,
    blob: { contentType: 'image/webp', size: 3 },
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]))
        controller.close()
      },
    }),
  }))
})
afterEach(() => vi.unstubAllEnvs())

describe('Privé Blob-opslag', () => {
  it('schrijft alleen privé en houdt beide collecties gescheiden', async () => {
    const adapter = privateBlobAdapter(token)({ collection: media })
    await adapter.handleUpload({
      file: { buffer: Buffer.from('foto'), mimeType: 'image/webp' },
      storageFilePath: 'foto.webp',
    } as Parameters<typeof adapter.handleUpload>[0])
    expect(mock.put).toHaveBeenCalledWith(
      'family-media/foto.webp',
      expect.any(Buffer),
      expect.objectContaining({ token, access: 'private', addRandomSuffix: false }),
    )
    const brand = privateBlobAdapter(token)({ collection: assets })
    await brand.handleDelete({ storageFilePath: 'logo.webp' } as Parameters<
      typeof brand.handleDelete
    >[0])
    expect(mock.del).toHaveBeenCalledWith('brand-assets/logo.webp', { token })
  })
  it.each([
    undefined,
    { collection: 'family-members', status: 'revoked' },
    { collection: 'family-members', status: 'invited' },
  ])('vraagt voor een onbevoegde gebruiker geen bestand bij de opslag op', async (user) => {
    const response = await privateBlobAdapter(token)({ collection: media }).staticHandler(
      request(user),
      fileArgs(),
    )
    expect(response.status).toBe(403)
    expect(mock.get).not.toHaveBeenCalled()
    expect(mock.find).not.toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
  it('bedient foto’s via de toegangscontrole, zonder publieke URL of cacheheaders van de opslag', async () => {
    const response = await privateBlobAdapter(token)({ collection: media }).staticHandler(
      request(member),
      fileArgs(),
    )
    expect(response.status).toBe(200)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
    expect(mock.find).toHaveBeenCalledWith(
      expect.objectContaining({ overrideAccess: false, collection: 'media' }),
    )
    expect(mock.get).toHaveBeenCalledWith(
      'family-media/foto.webp',
      expect.objectContaining({ token, access: 'private', useCache: false }),
    )
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('content-type')).toBe('image/webp')
  })
  it('mag een logo openbaar via de eigen route tonen terwijl de Blob privé blijft', async () => {
    const response = await privateBlobAdapter(token)({ collection: assets }).staticHandler(
      request(),
      fileArgs('logo.webp'),
    )
    expect(response.status).toBe(200)
    expect(mock.get).toHaveBeenCalledWith(
      'brand-assets/logo.webp',
      expect.objectContaining({ access: 'private' }),
    )
  })
  it('serveert geen object zonder bijbehorend databasebestand', async () => {
    mock.find.mockResolvedValue({ docs: [] })
    const response = await privateBlobAdapter(token)({ collection: media }).staticHandler(
      request(member),
      fileArgs(),
    )
    expect(response.status).toBe(404)
    expect(mock.get).not.toHaveBeenCalled()
  })
  it('lost de avatar en de opgeslagen objectmap op vanuit documentgegevens', async () => {
    const doc = { id: 1, prefix: 'submap', _objectKey: 'object-id' }
    await privateBlobAdapter(token)({ collection: media }).staticHandler(request(member), {
      ...fileArgs('foto-160x160.webp'),
      doc,
    })
    expect(mock.get).toHaveBeenCalledWith(
      'family-media/submap/object-id/foto-160x160.webp',
      expect.any(Object),
    )
  })
  it.each([
    '../ander.webp',
    '/absoluut.webp',
    'map//foto.webp',
    'map\\foto.webp',
    'foto.webp?token=x',
  ])('weigert een onveilig opslagpad: %s', async (storageFilePath) => {
    const adapter = privateBlobAdapter(token)({ collection: media })
    await expect(
      adapter.handleDelete({ storageFilePath } as Parameters<typeof adapter.handleDelete>[0]),
    ).rejects.toThrow('Ongeldig bestandspad')
    expect(mock.del).not.toHaveBeenCalled()
  })
  it('verbergt providerfouten en geeft ontbrekende bestanden als 404 terug', async () => {
    mock.get.mockRejectedValue(new Error('geheim token of interne URL'))
    const response = await privateBlobAdapter(token)({ collection: media }).staticHandler(
      request(member),
      fileArgs(),
    )
    expect(response.status).toBe(404)
    expect(await response.text()).not.toContain('geheim')
  })
  it('houdt hetzelfde databaseschema met en zonder Blob-token', async () => {
    const local = await familyBlobStorage()({ collections: [media, assets] } as Config)
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', token)
    const cloud = await familyBlobStorage()({ collections: [media, assets] } as Config)
    const names = (config: typeof local) =>
      config.collections?.map((c) => c.fields.map((f) => ('name' in f ? f.name : f.type)))
    expect(names(local)).toEqual(names(cloud))
    expect(
      typeof cloud.collections?.[0].upload === 'object' &&
        cloud.collections[0].upload.disableLocalStorage,
    ).toBe(true)
  })
  it('vereist een token op Vercel en beperkt uploads daar tot 4 MB', () => {
    expect(uploadLimit()).toBe(10 * 1024 * 1024)
    vi.stubEnv('VERCEL', '1')
    expect(() => familyBlobStorage()).toThrow('BLOB_READ_WRITE_TOKEN')
    expect(uploadLimit()).toBe(4 * 1024 * 1024)
  })
})
