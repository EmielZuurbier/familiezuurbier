import type { Media } from '../payload-types'
import type { PersonPhoto } from './types'

// A relative URL sends the current family's cookie even when the admin and
// frontend were opened under different local host names. Never use an image proxy.
export function personPhoto(photo: Media | undefined): PersonPhoto | undefined {
  if (!photo?.filename) return undefined
  const url = (filename: string) => `/api/media/file/${encodeURIComponent(filename)}`
  return {
    url: url(photo.filename),
    avatarUrl: photo.sizes?.avatar?.filename ? url(photo.sizes.avatar.filename) : undefined,
    alt: photo.alt,
    width: photo.width,
    height: photo.height,
  }
}
