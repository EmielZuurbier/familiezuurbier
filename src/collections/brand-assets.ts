import path from 'node:path'
import { APIError, type CollectionConfig } from 'payload'
import { administrator } from './access'
import { relationLock } from './collections'

export const BrandAssets: CollectionConfig = {
  slug: 'brand-assets',
  labels: { singular: 'Huisstijlbestand', plural: 'Huisstijlbestanden' },
  access: { read: () => true, create: administrator, update: administrator, delete: administrator },
  admin: {
    group: 'Website',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt'],
    description: 'Openbare logo’s en browsericonen. Upload privé familiefoto’s bij Afbeeldingen.',
  },
  upload: {
    staticDir: path.resolve(process.env.BRAND_ASSETS_DIR || 'uploads/brand-assets'),
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    pasteURL: false,
    displayPreview: true,
    constructorOptions: { limitInputPixels: 16_000_000 },
    resizeOptions: { width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true },
    formatOptions: { format: 'webp', options: { quality: 90 } },
    withMetadata: false,
    modifyResponseHeaders: ({ headers }) => {
      headers.set('X-Content-Type-Options', 'nosniff')
      return headers
    },
  },
  hooks: {
    beforeDelete: [
      async ({ id, req }) => {
        await relationLock(req)
        const settings = await req.payload.findGlobal({
          slug: 'site-settings',
          depth: 0,
          overrideAccess: true,
          req,
        })
        if (settings.identity?.logo === id || settings.identity?.icon === id)
          throw new APIError(
            'Dit bestand is nog het logo of browsericoon van de website. Kies eerst een ander bestand bij Website-instellingen.',
            400,
          )
      },
    ],
  },
  fields: [{ name: 'alt', label: 'Beschrijving', type: 'text' }],
}
