import { describe, it, expect } from 'vitest'
import { personPhoto } from '../src/lib/person-photo'
import type { Media } from '../src/payload-types'

describe('Afgeschermde fotolinks', () => {
  it('houdt foto en avatar op de huidige host zodat de familiecookie wordt meegestuurd', () => {
    const photo: Media = {
      id: 1,
      createdAt: '',
      updatedAt: '',
      filename: 'fictief portret.webp',
      url: 'http://localhost:3000/api/media/file/fictief%20portret.webp',
      sizes: {
        avatar: { filename: 'fictief-avatar.webp', url: 'http://andere-host.invalid/avatar.webp' },
      },
    }
    const before = JSON.stringify(photo)
    expect(personPhoto(photo)).toMatchObject({
      url: '/api/media/file/fictief%20portret.webp',
      avatarUrl: '/api/media/file/fictief-avatar.webp',
    })
    expect(JSON.stringify(photo)).toBe(before)
  })
  it('verzint geen bestand als er geen foto is en staat ontbrekende kleine varianten toe', () => {
    expect(personPhoto(undefined)).toBeUndefined()
    expect(
      personPhoto({
        id: 1,
        createdAt: '',
        updatedAt: '',
        url: 'https://example.invalid/private.jpg',
      }),
    ).toBeUndefined()
    expect(
      personPhoto({ id: 1, createdAt: '', updatedAt: '', filename: 'voorbeeld.webp' })?.avatarUrl,
    ).toBeUndefined()
  })
})
