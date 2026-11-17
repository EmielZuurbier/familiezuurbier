import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { cookieName, secretHash } from '../src/lib/family-auth/primitives'

if (!process.env.DATABASE_URL) throw new Error('Een lokale database is nodig.')
const database = new URL(process.env.DATABASE_URL)
database.pathname = `/familieboom_fotos_test_${Date.now()}`
process.env.DATABASE_URL = database.toString()
const mediaDir = await mkdtemp(path.join(tmpdir(), 'familieboom-fotos-'))
process.env.FAMILY_MEDIA_DIR = mediaDir
const { getPayload, handleEndpoints } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
const check = (value: unknown, message: string) => {
  assert(value, message)
  checks++
}
let checks = 0
const request = (pathname: string, cookie?: string) =>
  handleEndpoints({
    config,
    request: new Request(`http://127.0.0.1:3000${pathname}`, {
      headers: cookie ? { cookie } : undefined,
    }),
  })
try {
  const password = randomBytes(24).toString('hex')
  const admin = await payload.create({
    collection: 'administrators',
    data: { name: 'Fictieve fotobeheerder', email: 'fotos@example.invalid', password },
    overrideAccess: true,
    context: { bootstrapAdministrator: true },
  })
  const auth = {
    user: { ...admin, collection: 'administrators' as const },
    overrideAccess: false,
    depth: 0,
  }
  const login = await payload.login({
    collection: 'administrators',
    data: { email: admin.email, password },
  })
  const adminCookie = `${payload.config.cookiePrefix}-token=${login.token}`
  const bytes = await sharp({
    create: { width: 2400, height: 1800, channels: 3, background: '#90aa82' },
  })
    .withExif({ IFD0: { Artist: 'Fictieve proefmetadata' } })
    .jpeg()
    .toBuffer()
  const upload = await payload.create({
    collection: 'media',
    data: { alt: 'Uitsluitend een fictieve kleurproef' },
    file: {
      data: bytes,
      name: 'fictieve-kleurproef.jpg',
      mimetype: 'image/jpeg',
      size: bytes.length,
    },
    ...auth,
  })
  check(
    upload.mimeType === 'image/webp' && upload.width === 1600 && upload.height === 1200,
    'Foto wordt begrensd en omgezet.',
  )
  check(
    upload.sizes?.avatar?.width === 160 && upload.sizes.avatar.height === 160,
    'Er is een vierkante avatar.',
  )
  const avatarUpload = await payload.create({
    collection: 'media',
    data: { alt: 'Afzonderlijke fictieve avatarfoto' },
    file: {
      data: bytes,
      name: 'afzonderlijke-avatar.jpg',
      mimetype: 'image/jpeg',
      size: bytes.length,
    },
    ...auth,
  })
  const person = await payload.create({
    collection: 'people',
    data: {
      name: 'Fictieve persoon met foto',
      lifeStatus: 'unknown',
      isExample: true,
      photo: upload.id,
      avatarPhoto: avatarUpload.id,
      avatarIcon: 'flower',
    },
    ...auth,
  })
  check(
    person.photo === upload.id &&
      person.avatarPhoto === avatarUpload.id &&
      person.avatarIcon === 'flower',
    'Portretfoto, avatarfoto en icoon zijn onafhankelijk opgeslagen.',
  )
  const read = await payload.findByID({ collection: 'people', id: person.id, ...auth, depth: 1 })
  check(
    typeof read.photo === 'object' && read.photo?.id === upload.id,
    'Gekoppelde afbeelding is terug te lezen.',
  )
  check(
    typeof read.avatarPhoto === 'object' && read.avatarPhoto?.id === avatarUpload.id,
    'De afzonderlijke avatarfoto is terug te lezen.',
  )
  await assert.rejects(payload.delete({ collection: 'media', id: upload.id, ...auth }))
  checks++
  const filePath = `/api/media/file/${encodeURIComponent(upload.filename!)}`
  const thumbPath = `/api/media/file/${encodeURIComponent(upload.sizes!.avatar!.filename!)}`
  const avatarPath = `/api/media/file/${encodeURIComponent(avatarUpload.filename!)}`
  const avatarThumbPath = `/api/media/file/${encodeURIComponent(avatarUpload.sizes!.avatar!.filename!)}`
  const full = await request(filePath, adminCookie)
  check(full.status === 200, 'Beheerder mag de foto ophalen.')
  check(full.headers.get('cache-control')?.includes('no-store'), 'Foto mag niet worden gecachet.')
  const metadata = await sharp(Buffer.from(await full.arrayBuffer())).metadata()
  check(!metadata.exif && !metadata.xmp && !metadata.iptc, 'Bronmetadata wordt niet bewaard.')
  check((await request(thumbPath, adminCookie)).status === 200, 'Beheerder mag de avatar ophalen.')
  for (const url of [filePath, thumbPath, avatarPath, avatarThumbPath, '/api/media']) {
    const response = await request(url)
    check(response.status === 403, 'Anonieme bezoekers mogen foto noch avatar noch metadata lezen.')
  }
  const member = await payload.create({
    collection: 'family-members',
    data: {
      name: 'Fictief kijkaccount',
      email: 'kijker@example.invalid',
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
  const familyCookie = `${cookieName(payload.config.cookiePrefix)}=${token}`
  check(
    (await request(filePath, familyCookie)).status === 200,
    'Actief familielid mag de foto lezen.',
  )
  check(
    (await request(thumbPath, familyCookie)).status === 200,
    'Actief familielid mag de avatar lezen.',
  )
  check(
    (await request(avatarThumbPath, familyCookie)).status === 200,
    'Het actieve familielid mag de afzonderlijke avatarfoto bekijken.',
  )
  const familyAuth = {
    user: { ...member, collection: 'family-members' as const },
    overrideAccess: false,
  }
  await assert.rejects(
    payload.update({
      collection: 'media',
      id: upload.id,
      data: { alt: 'Niet toegestaan' },
      ...familyAuth,
    }),
  )
  checks++
  await assert.rejects(
    payload.create({
      collection: 'media',
      data: {},
      file: { data: bytes, name: 'verboden.jpg', mimetype: 'image/jpeg', size: bytes.length },
      ...familyAuth,
    }),
  )
  checks++
  await payload.update({
    collection: 'family-members',
    id: member.id,
    data: { status: 'revoked', authVersion: 2 },
    overrideAccess: true,
  })
  check(
    (await request(filePath, familyCookie)).status === 403,
    'Intrekken blokkeert een bestaande fotolink onmiddellijk.',
  )
  check(
    (await request(avatarThumbPath, familyCookie)).status === 403,
    'Intrekken blokkeert ook de afzonderlijke avatarfoto.',
  )
  const unsafe = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
  )
  const oversized = new FormData()
  oversized.set(
    'file',
    new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'te-groot.jpg', { type: 'image/jpeg' }),
  )
  const tooLarge = await handleEndpoints({
    config,
    request: new Request('http://127.0.0.1:3000/api/media', {
      method: 'POST',
      headers: { cookie: adminCookie },
      body: oversized,
    }),
  })
  check(tooLarge.status === 413, 'De uploadgrens geldt ook voor echte uploadverzoeken.')
  await assert.rejects(
    payload.create({
      collection: 'media',
      data: {},
      file: { data: unsafe, name: 'onveilig.svg', mimetype: 'image/svg+xml', size: unsafe.length },
      ...auth,
    }),
  )
  checks++
  await payload.update({ collection: 'people', id: person.id, data: { photo: null }, ...auth })
  check(
    (await payload.findByID({ collection: 'people', id: person.id, ...auth })).avatarPhoto ===
      avatarUpload.id,
    'Portretfoto weghalen behoudt de afzonderlijke avatarfoto.',
  )
  await assert.rejects(payload.delete({ collection: 'media', id: avatarUpload.id, ...auth }))
  checks++
  check(
    (await payload.findByID({ collection: 'people', id: person.id, ...auth })).avatarIcon ===
      'flower',
    'Foto verwijderen behoudt het afzonderlijke icoon.',
  )
  await payload.delete({ collection: 'media', id: upload.id, ...auth })
  await payload.update({
    collection: 'people',
    id: person.id,
    data: { avatarPhoto: null },
    ...auth,
  })
  await payload.delete({ collection: 'media', id: avatarUpload.id, ...auth })
  check(
    (await payload.count({ collection: 'media', overrideAccess: true })).totalDocs === 0,
    'Losgekoppelde foto kan worden verwijderd.',
  )
  console.log(
    `${checks} fotocontroles geslaagd: upload, eigen avatar-icoon, formaten, metadata, gekoppelde foto’s, leesrechten, afgeschermde originelen/avatars en directe intrekking. Uitsluitend fictieve gegevens in een afzonderlijke testdatabase.`,
  )
} finally {
  await payload.destroy()
  await rm(mediaDir, { recursive: true, force: true })
}
process.exit(0)
