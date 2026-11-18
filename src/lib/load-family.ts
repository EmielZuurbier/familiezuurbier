import 'server-only'
import { headers } from 'next/headers'
import { demoFamily } from './demo'
import { effectiveParentages } from './relations'
import { databaseConfigured } from './settings'
import type { Family } from './types'
import { normalizeStory, storyMediaIds, storyPlainText } from './events/story'
import { personPhoto } from './person-photo'
import type { Payload } from 'payload'
export type FamilyResult =
  | {
      kind: 'ready'
      family: Family
      demo: boolean
      persistent: boolean
      viewer?: 'administrator' | 'family'
    }
  | { kind: 'private' | 'setup' | 'error' }
async function familyStorage(): Promise<
  { kind: 'empty' | 'setup' | 'error' } | { kind: 'filled'; payload: Payload }
> {
  // A fresh installation may show examples. A configured but unavailable
  // database must never silently fall back to a different family.
  if (!process.env.DATABASE_URL) return { kind: 'empty' }
  if (!databaseConfigured()) return { kind: 'setup' }
  try {
    const { getPayload } = await import('payload'),
      config = await import('@payload-config')
    const payload = await getPayload({ config: config.default })
    const { totalDocs } = await payload.count({ collection: 'people', overrideAccess: true })
    if (totalDocs > 0) return { kind: 'filled', payload }
    const events = await payload.count({ collection: 'events', overrideAccess: true })
    return events.totalDocs === 0 ? { kind: 'empty' } : { kind: 'filled', payload }
  } catch {
    return { kind: 'error' }
  }
}
export async function examplesAvailable(): Promise<boolean> {
  return (await familyStorage()).kind === 'empty'
}
export async function loadFamily(): Promise<FamilyResult> {
  const storage = await familyStorage()
  if (storage.kind === 'empty')
    return { kind: 'ready', family: demoFamily, demo: true, persistent: false }
  if (storage.kind === 'setup' || storage.kind === 'error') return { kind: storage.kind }
  if (storage.kind !== 'filled') return { kind: 'error' }
  try {
    const { payload } = storage
    const { user } = await payload.auth({ headers: await headers() })
    if (
      !user ||
      (user.collection !== 'administrators' &&
        !(user.collection === 'family-members' && user.status === 'active'))
    )
      return { kind: 'private' }
    // Local API bypasses access control by default. Always explicitly enforce it here.
    const access = { depth: 0, pagination: false as const, overrideAccess: false, user }
    const [people, parentages, partnerships, events] = await Promise.all([
      payload.find({ collection: 'people', ...access }),
      payload.find({ collection: 'parentages', ...access }),
      payload.find({ collection: 'partnerships', ...access }),
      payload.find({ collection: 'events', ...access }),
    ])
    const id = (v: unknown) => String(typeof v === 'object' && v && 'id' in v ? v.id : v)
    const eventStories = events.docs.map((event) => normalizeStory(event.story))
    const photoIds = [
      ...new Set([
        ...people.docs.flatMap((person) =>
          [person.photo, person.avatarPhoto].filter(Boolean).map((photo) => Number(id(photo))),
        ),
        ...events.docs.flatMap((event, index) => [
          ...storyMediaIds(eventStories[index]),
          ...(event.cover ? [Number(id(event.cover))] : []),
        ]),
      ]),
    ]
    const media = photoIds.length
      ? (
          await payload.find({
            collection: 'media',
            where: { id: { in: photoIds } },
            ...access,
          })
        ).docs
      : []
    const photos = new Map(media.map((photo) => [String(photo.id), photo]))
    const pairs = partnerships.docs.map((r) => ({
      id: String(r.id),
      personA: id(r.personA),
      personB: id(r.personB),
      status: r.status,
      children: (r.children ?? []).map(id),
    }))
    const manual = parentages.docs.map((r) => ({
      id: String(r.id),
      parent: id(r.parent),
      child: id(r.child),
    }))
    return {
      kind: 'ready',
      demo: people.docs.length > 0 && people.docs.every((p) => p.isExample),
      persistent: true,
      viewer: user.collection === 'administrators' ? 'administrator' : 'family',
      family: {
        people: people.docs.map((p) => {
          const photo = p.photo ? photos.get(id(p.photo)) : undefined
          const avatarPhoto = p.avatarPhoto ? photos.get(id(p.avatarPhoto)) : undefined
          return {
            id: String(p.id),
            name: p.name,
            avatarIcon: p.avatarIcon,
            photo: personPhoto(photo),
            avatarPhoto: personPhoto(avatarPhoto),
            birthSurname: p.birthSurname,
            currentResidence: p.currentResidence,
            isExample: !!p.isExample,
            birth: p.birth ?? {},
            birthPlace: p.birthPlace,
            lifeStatus: p.lifeStatus,
            death: p.death ?? {},
          }
        }),
        parentages: effectiveParentages(manual, pairs),
        partnerships: pairs,
        events: events.docs.map((event, index) => {
          const story = eventStories[index]
          return {
            id: String(event.id),
            title: event.title,
            date: event.date ?? {},
            place: event.place,
            people: (event.relatedPeople ?? []).map(id),
            story,
            excerpt: storyPlainText(story),
            cover: event.cover ? personPhoto(photos.get(id(event.cover))) : undefined,
            images: Object.fromEntries(
              storyMediaIds(story).flatMap((imageId) => {
                const photo = personPhoto(photos.get(String(imageId)))
                return photo ? [[String(imageId), photo]] : []
              }),
            ),
          }
        }),
      },
    }
  } catch {
    return { kind: 'error' }
  }
}
