import { APIError, type Plugin } from 'payload'
import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import type { Adapter } from '@payloadcms/plugin-cloud-storage/types'
import { getStorageFilePath } from '@payloadcms/plugin-cloud-storage/utilities'
import { get, put, del } from '@vercel/blob'
import { familyRead } from '../collections/access'

/** All objects are private. Even public logos are served through Payload's own file route. */
export function privateBlobAdapter(token: string): Adapter {
  return ({ collection }) => {
    const folder =
      collection.slug === 'media'
        ? 'family-media'
        : collection.slug === 'brand-assets'
          ? 'brand-assets'
          : null
    if (!folder) throw new Error('Deze collectie ondersteunt geen familieopslag.')
    const key = (filePath: string) => {
      if (
        !filePath ||
        /[\\\x00-\x1f?#]/.test(filePath) ||
        filePath.split('/').some((part) => !part || part === '.' || part === '..')
      )
        throw new APIError('Ongeldig bestandspad.', 400)
      return `${folder}/${filePath}`
    }
    return {
      name: 'family-private-vercel-blob',
      // No public Blob URLs are persisted or returned to the browser.
      handleUpload: async ({ file, storageFilePath }) => {
        const destination = key(storageFilePath)
        try {
          await put(destination, file.buffer, {
            access: 'private',
            token,
            contentType: file.mimeType,
            addRandomSuffix: false,
            allowOverwrite: true,
          })
        } catch {
          throw new APIError(
            'De afbeelding kon niet worden opgeslagen. Controleer de verbinding met de privé-opslag.',
            503,
          )
        }
      },
      handleDelete: async ({ storageFilePath }) => {
        const destination = key(storageFilePath)
        try {
          await del(destination, { token })
        } catch {
          throw new APIError(
            'De afbeelding kon niet uit de privé-opslag worden verwijderd. Probeer het opnieuw.',
            503,
          )
        }
      },
      staticHandler: async (req, { doc, params: { filename } }) => {
        const headers = new Headers({
          'Cache-Control': 'private, no-store, max-age=0',
          'X-Content-Type-Options': 'nosniff',
          Vary: 'Cookie, Authorization',
        })
        if (collection.slug === 'media' && (await familyRead({ req })) !== true)
          return new Response(null, { status: 403, headers })
        try {
          const sizeNames =
            typeof collection.upload === 'object'
              ? (collection.upload.imageSizes?.map((size) => size.name) ?? [])
              : []
          const record =
            doc ??
            (
              await req.payload.find({
                collection: collection.slug as 'media' | 'brand-assets',
                depth: 0,
                limit: 1,
                overrideAccess: false,
                req,
                where: {
                  or: [
                    { filename: { equals: filename } },
                    ...sizeNames.map((size) => ({
                      [`sizes.${size}.filename`]: { equals: filename },
                    })),
                  ],
                },
              })
            ).docs[0]
          if (!record) return new Response(null, { status: 404, headers })
          // Resolves metadata with overrideAccess:false when Payload did not supply a document.
          const path = await getStorageFilePath({ collection, doc: record, filename, req })
          const result = await get(key(path), { access: 'private', token, useCache: false })
          if (!result || result.statusCode !== 200)
            return new Response(null, { status: 404, headers })
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(result.blob.contentType)) {
            await result.stream.cancel()
            return new Response(null, { status: 404, headers })
          }
          headers.set('Content-Type', result.blob.contentType)
          headers.set('Content-Length', String(result.blob.size))
          return new Response(result.stream, { headers })
        } catch {
          // Do not send storage URLs, provider errors or credentials to visitors.
          return new Response(null, { status: 404, headers })
        }
      },
    }
  }
}

export function familyBlobStorage(): Plugin {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim()
  if (process.env.VERCEL && !token)
    throw new Error('Stel BLOB_READ_WRITE_TOKEN in voor de privé-bestandsopslag op Vercel.')
  const adapter = token ? privateBlobAdapter(token) : null
  return cloudStoragePlugin({
    enabled: !!token,
    // Identical schema locally, in preview and in production; never depend on a secret for fields.
    alwaysInsertFields: true,
    collections: { media: { adapter }, 'brand-assets': { adapter } },
  })
}
