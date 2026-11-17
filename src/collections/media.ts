import path from 'node:path'
import { APIError, type CollectionConfig } from 'payload'
import { familyAccess } from './access'
import { relationLock } from './collections'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Afbeelding', plural: 'Afbeeldingen' },
  access: familyAccess,
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'updatedAt'],
    description: 'Privé familiefoto’s. Upload hier of direct vanuit een persoon een portretfoto.',
  },
  upload: {
    staticDir: path.resolve(process.env.FAMILY_MEDIA_DIR || 'uploads/family-media'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    pasteURL: false,
    adminThumbnail: 'avatar',
    displayPreview: true,
    constructorOptions: { limitInputPixels: 40_000_000 },
    resizeOptions: { width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true },
    formatOptions: { format: 'webp', options: { quality: 85 } },
    withMetadata: false,
    imageSizes: [
      {
        name: 'avatar',
        width: 160,
        height: 160,
        fit: 'cover',
        formatOptions: { format: 'webp', options: { quality: 85 } },
      },
    ],
    modifyResponseHeaders: ({ headers }) => {
      headers.set('Cache-Control', 'private, no-store, max-age=0')
      headers.set('X-Content-Type-Options', 'nosniff')
      return headers
    },
  },
  hooks: {
    beforeDelete: [
      async ({ id, req }) => {
        await relationLock(req)
        const people = await req.payload.count({
          collection: 'people',
          where: { or: [{ photo: { equals: id } }, { avatarPhoto: { equals: id } }] },
          overrideAccess: true,
          req,
        })
        if (people.totalDocs)
          throw new APIError(
            'Deze afbeelding is nog gekoppeld aan een persoon. Haal de foto eerst bij die persoon weg of kies een andere foto.',
            400,
          )
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      label: 'Beschrijving',
      type: 'text',
      admin: { description: 'Optionele korte beschrijving van de foto.' },
    },
  ],
}
