import { APIError, type CollectionConfig } from 'payload'
import { familyAccess } from './access'
import { dateFields, relationLock } from './collections'
import { relationshipId } from './family-data'
import { dateError } from '../lib/dates'
import { normalizeStory, storyMediaIds } from '../lib/events/story'

export const Events: CollectionConfig = {
  slug: 'events',
  labels: { singular: 'Gebeurtenis', plural: 'Gebeurtenissen' },
  access: familyAccess,
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date.year', 'place', 'updatedAt'],
    description:
      'Bewaar de familiegeschiedenis. Schrijf een verhaal en koppel de betrokken familieleden.',
  },
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data
        const title = String(data.title ?? originalDoc?.title ?? '').trim()
        if (!title) throw new APIError('Geef de gebeurtenis een titel.', 400)
        const error = dateError({ ...originalDoc?.date, ...data.date })
        if (error) throw new APIError(`Datum: ${error}`, 400)
        let story
        try {
          story = normalizeStory(data.story === undefined ? originalDoc?.story : data.story)
        } catch (error) {
          throw new APIError(
            error instanceof Error ? error.message : 'Controleer het verhaal.',
            400,
          )
        }
        return { ...data, title, story }
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        await relationLock(req)
        const cover = data.cover === undefined ? originalDoc?.cover : data.cover
        const relatedPeople =
          data.relatedPeople === undefined ? originalDoc?.relatedPeople : data.relatedPeople
        const media = [
          ...new Set([
            ...storyMediaIds(normalizeStory(data.story)),
            ...(cover ? [Number(relationshipId(cover))] : []),
          ]),
        ]
        if (media.length) {
          const found = await req.payload.count({
            collection: 'media',
            where: { id: { in: media } },
            overrideAccess: true,
            req,
          })
          if (found.totalDocs !== media.length)
            throw new APIError(
              'Een gekoppelde afbeelding bestaat niet meer. Kies de afbeelding opnieuw.',
              400,
            )
        }
        return {
          ...data,
          relatedPeople: [...new Set((relatedPeople ?? []).map(relationshipId))].map(Number),
          mediaReferences: media,
        }
      },
    ],
    beforeDelete: [
      async ({ req }) => {
        await relationLock(req)
      },
    ],
  },
  fields: [
    {
      name: 'title',
      label: 'Titel',
      type: 'text',
      required: true,
      maxLength: 180,
      admin: {
        description:
          'Geef de gebeurtenis een herkenbare naam, bijvoorbeeld ‘De verhuizing naar Haarlem’.',
      },
    },
    dateFields('date', 'Datum'),
    {
      name: 'place',
      label: 'Plaats',
      type: 'text',
      admin: { components: { Field: './components/PlaceField#PlaceField' } },
    },
    {
      name: 'cover',
      label: 'Omslagfoto',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Optioneel. Verschijnt op het kaartje en bovenaan het verhaal.' },
    },
    {
      name: 'relatedPeople',
      label: 'Betrokken personen',
      type: 'relationship',
      relationTo: 'people',
      hasMany: true,
      defaultValue: [],
      admin: {
        isSortable: true,
        description:
          'Koppel de familieleden die bij dit verhaal horen. Het verschijnt ook bij hun persoonsgegevens.',
      },
    },
    {
      name: 'story',
      label: 'Verhaal',
      type: 'json',
      defaultValue: { version: 1, blocks: [] },
      admin: { components: { Field: './components/events/GutenbergField#GutenbergField' } },
    },
    {
      name: 'mediaReferences',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
      hidden: true,
      admin: { disabled: true },
      access: { read: () => false },
    },
  ],
}
