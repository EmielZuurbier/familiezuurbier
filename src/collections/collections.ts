import { uploadLimitMB } from '../lib/upload-limits'
import type { CollectionConfig, Field, PayloadRequest } from 'payload'
import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres/drizzle'
import { APIError } from 'payload'
import { administrator, familyAccess } from './access'
import { dateError, dateOrderError } from '../lib/dates'
import {
  parentageError,
  relationKey,
  effectiveParentages,
  ancestryCycleError,
} from '../lib/relations'
import { relationshipId, readFamilyRelations } from './family-data'
import type { PartialDate } from '../lib/types'
import { avatarOptions } from '../lib/avatars'

function fail(message: string): never {
  throw new APIError(message, 400)
}
export async function relationLock(req: PayloadRequest) {
  const db = req.payload.db as unknown as PostgresAdapter
  const transactionID = await req.transactionID
  if (!transactionID || !db.sessions[transactionID])
    throw new APIError('Relaties wijzigen vereist een databasetransactie.', 500)
  // Serialize relationship edits and person deletions, including concurrent requests.
  await db.sessions[transactionID].db.execute(sql`SELECT pg_advisory_xact_lock(1947162026)`)
}
export function dateFields(name: string, label: string): Field {
  return {
    name,
    label,
    type: 'group',
    admin: {
      description: 'Vul alleen bekende onderdelen in. Laat onbekende velden leeg.',
      condition: name === 'death' ? (data) => data.lifeStatus === 'deceased' : undefined,
    },
    fields: [
      {
        type: 'row',
        fields: [
          { name: 'day', label: 'Dag', type: 'number', min: 1, max: 31, admin: { width: '25%' } },
          {
            name: 'month',
            label: 'Maand',
            type: 'number',
            min: 1,
            max: 12,
            admin: { width: '25%' },
          },
          {
            name: 'year',
            label: 'Jaar',
            type: 'number',
            min: 1,
            max: 9999,
            admin: { width: '50%' },
          },
        ],
      },
    ],
  }
}
export const Administrators: CollectionConfig = {
  slug: 'administrators',
  labels: { singular: 'Beheerder', plural: 'Beheerders' },
  auth: { tokenExpiration: 7200, maxLoginAttempts: 5, lockTime: 600000 },
  admin: { useAsTitle: 'name', description: 'Alleen beheerders kunnen familiegegevens wijzigen.' },
  access: {
    admin: ({ req }) => req.user?.collection === 'administrators',
    read: administrator,
    create: administrator,
    update: administrator,
    delete: administrator,
  },
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        // Payload first-register bypasses collection access. Reject anonymous creation in this hook too.
        if (operation === 'create' && !req.user && req.context.bootstrapAdministrator !== true)
          throw new APIError('Maak de eerste beheerder lokaal via npm run admin:create.', 403)
        return data
      },
    ],
    beforeDelete: [
      async ({ req }) => {
        const count = await req.payload.count({
          collection: 'administrators',
          req,
          overrideAccess: true,
        })
        if (count.totalDocs <= 1) fail('De laatste beheerder kan niet worden verwijderd.')
      },
    ],
  },
  fields: [{ name: 'name', label: 'Naam', type: 'text', required: true }],
}
export const People: CollectionConfig = {
  slug: 'people',
  labels: { singular: 'Persoon', plural: 'Personen' },
  access: familyAccess,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'lifeStatus', 'updatedAt'],
    description:
      'Voeg personen toe. Kies daarna bij Partnerschappen de twee partners en hun gezamenlijke kinderen.',
  },
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data
        const birth: PartialDate = { ...originalDoc?.birth, ...data.birth },
          death: PartialDate = { ...originalDoc?.death, ...data.death }
        const lifeStatus = data.lifeStatus ?? originalDoc?.lifeStatus ?? 'unknown'
        for (const [label, date] of [
          ['Geboorte', birth],
          ['Overlijden', death],
        ] as const) {
          const message = dateError(date)
          if (message) fail(`${label}: ${message}`)
        }
        if (dateOrderError(birth, death)) fail('Overlijden kan niet voor de geboorte liggen.')
        const hasDeath = Object.values(death).some((v) => v != null)
        if (lifeStatus !== 'deceased' && hasDeath)
          fail(
            'Er is nog een overlijdensdatum opgeslagen. Vink ‘Overleden’ aan om deze zichtbaar te maken. Wil je het vinkje uitzetten, wis dan eerst de overlijdensdatum.',
          )
        data.name = String(data.name ?? originalDoc?.name ?? '').trim()
        if (!data.name) fail('Vul een naam in.')
        return data
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        // Serialize name changes with partnership edits so derived titles stay current.
        if (
          data.name !== originalDoc?.name ||
          data.photo !== undefined ||
          data.avatarPhoto !== undefined
        )
          await relationLock(req)
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (doc.name === previousDoc?.name) return doc
        const pairs = await req.payload.find({
          collection: 'partnerships',
          where: { or: [{ personA: { equals: doc.id } }, { personB: { equals: doc.id } }] },
          depth: 0,
          pagination: false,
          overrideAccess: true,
          req,
        })
        for (const pair of pairs.docs)
          await req.payload.update({
            collection: 'partnerships',
            id: pair.id,
            data: {},
            overrideAccess: true,
            req,
          })
        return doc
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        await relationLock(req)
        const [parents, partners, events] = await Promise.all([
          req.payload.count({
            collection: 'parentages',
            where: { or: [{ parent: { equals: id } }, { child: { equals: id } }] },
            req,
            overrideAccess: true,
          }),
          req.payload.count({
            collection: 'partnerships',
            where: {
              or: [
                { personA: { equals: id } },
                { personB: { equals: id } },
                { children: { in: [id] } },
              ],
            },
            req,
            overrideAccess: true,
          }),
          req.payload.count({
            collection: 'events',
            where: { relatedPeople: { in: [id] } },
            req,
            overrideAccess: true,
          }),
        ])
        if (parents.totalDocs || partners.totalDocs || events.totalDocs)
          fail(
            'Verwijder eerst de koppelingen bij gebeurtenissen, partnerschappen en losse ouder-kindrelaties van deze persoon.',
          )
      },
    ],
  },
  fields: [
    {
      name: 'isExample',
      label: 'Fictieve voorbeeldpersoon',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Alleen aanvinken voor verzonnen testpersonen.' },
    },
    { name: 'name', label: 'Volledige naam', type: 'text', required: true, index: true },
    {
      name: 'photo',
      label: 'Portretfoto',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: `Optioneel. Upload een JPG, PNG of WebP van maximaal ${uploadLimitMB()} MB. De foto wordt alleen aan ingelogde familieleden en beheerders getoond.`,
      },
    },
    {
      name: 'avatarPhoto',
      label: 'Avatarfoto',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Optionele aparte foto voor de ronde avatar. Kies hieronder ‘Foto’ om deze te tonen. Zonder avatarfoto wordt de portretfoto gebruikt, of anders initialen.',
      },
    },
    {
      name: 'avatarIcon',
      label: 'Avatar op kaartjes',
      type: 'select',
      defaultValue: 'auto',
      options: [...avatarOptions],
      admin: {
        description:
          'Kies Foto, initialen of een apart icoon. Foto gebruikt eerst de avatarfoto en anders de portretfoto. De portretfoto blijft apart bij de persoonsgegevens staan.',
      },
    },
    {
      name: 'birthSurname',
      label: 'Achternaam bij geboorte',
      type: 'text',
      admin: { description: 'Vul de oorspronkelijke achternaam in, als die bekend is.' },
    },
    {
      name: 'currentResidence',
      label: 'Huidige woonplaats',
      type: 'text',
      admin: { components: { Field: './components/PlaceField#PlaceField' } },
    },
    dateFields('birth', 'Geboortedatum'),
    {
      name: 'birthPlace',
      label: 'Geboorteplaats',
      type: 'text',
      admin: { components: { Field: './components/PlaceField#PlaceField' } },
    },
    {
      name: 'lifeStatus',
      label: 'Overleden',
      type: 'select',
      required: true,
      defaultValue: 'unknown',
      options: [
        { label: 'Onbekend', value: 'unknown' },
        { label: 'In leven (bevestigd)', value: 'living' },
        { label: 'Overleden', value: 'deceased' },
      ],
      admin: {
        disableListFilter: true,
        components: {
          Field: './components/DeceasedCheckbox#DeceasedCheckbox',
          Cell: './components/DeceasedCheckbox#DeceasedCell',
        },
      },
    },
    dateFields('death', 'Overlijdensdatum'),
    {
      name: 'deathPlace',
      // Retain the legacy column without exposing or accepting this retired field.
      type: 'text',
      hidden: true,
      admin: {
        disabled: true,
        disableListColumn: true,
        disableListFilter: true,
        disableGroupBy: true,
      },
      access: { read: () => false, create: () => false, update: () => false },
    },
  ],
}
const pairKey: Field = {
  name: 'pairKey',
  type: 'text',
  unique: true,
  index: true,
  admin: { hidden: true },
  access: { read: () => false },
}
export const Parentages: CollectionConfig = {
  slug: 'parentages',
  labels: { singular: 'Losse ouder-kindrelatie', plural: 'Losse ouder-kindrelaties' },
  access: familyAccess,
  admin: {
    defaultColumns: ['parent', 'child'],
    description:
      'Alleen voor afzonderlijk ouderschap, bijvoorbeeld als één ouder onbekend is. Gezamenlijke kinderen voeg je één keer toe bij Partnerschappen.',
  },
  hooks: {
    beforeDelete: [
      async ({ req }) => {
        await relationLock(req)
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        await relationLock(req)
        const parent = relationshipId(data.parent ?? originalDoc?.parent),
          child = relationshipId(data.child ?? originalDoc?.child)
        const family = await readFamilyRelations(req)
        const ownId = originalDoc?.id == null ? undefined : String(originalDoc.id)
        const error = parentageError(parent, child, family.manual, ownId)
        if (error) fail(error)
        const manual = [
          ...family.manual.filter((r) => r.id !== ownId),
          { id: ownId ?? 'new', parent, child },
        ]
        const cycle = ancestryCycleError(effectiveParentages(manual, family.partnerships))
        if (cycle) fail(cycle)
        data.pairKey = relationKey(parent, child)
        return data
      },
    ],
  },
  fields: [
    { name: 'parent', label: 'Ouder', type: 'relationship', relationTo: 'people', required: true },
    { name: 'child', label: 'Kind', type: 'relationship', relationTo: 'people', required: true },
    pairKey,
  ],
}
export const Partnerships: CollectionConfig = {
  slug: 'partnerships',
  labels: { singular: 'Partnerschap', plural: 'Partnerschappen' },
  access: familyAccess,
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'children', 'status'],
    description:
      'Kies twee partners en voeg hun gezamenlijke kinderen hier één keer toe. Elk partnerschap heeft een eigen kinderenlijst.',
  },
  hooks: {
    beforeDelete: [
      async ({ id, req }) => {
        await relationLock(req)
        const pair = await req.payload.findByID({
          collection: 'partnerships',
          id,
          depth: 0,
          overrideAccess: true,
          req,
        })
        if (pair.children?.length)
          fail(
            'Dit partnerschap heeft gezamenlijke kinderen. Haal die eerst bewust uit de kinderenlijst, of leg hun ouderschap los vast voordat je het partnerschap verwijdert.',
          )
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        await relationLock(req)
        const a = relationshipId(data.personA ?? originalDoc?.personA),
          b = relationshipId(data.personB ?? originalDoc?.personB)
        if (a === b) fail('Een persoon kan niet de eigen partner zijn.')
        const [personA, personB] = [a, b].sort()
        const pairKey = relationKey(a, b, true)
        const first = await req.payload.findByID({
          collection: 'people',
          id: Number(personA),
          depth: 0,
          select: { name: true },
          overrideAccess: true,
          req,
        })
        const second = await req.payload.findByID({
          collection: 'people',
          id: Number(personB),
          depth: 0,
          select: { name: true },
          overrideAccess: true,
          req,
        })
        const rawChildren =
          (data.children === undefined ? originalDoc?.children : data.children) ?? []
        if (!Array.isArray(rawChildren)) fail('Selecteer kinderen uit de personenlijst.')
        const children = [...new Set<string>(rawChildren.map(relationshipId))]
        if (children.includes(a) || children.includes(b))
          fail('Een partner kan niet het eigen gezamenlijke kind zijn.')
        const oldA = relationshipId(originalDoc?.personA),
          oldB = relationshipId(originalDoc?.personB)
        if (
          originalDoc?.children?.length &&
          children.length &&
          relationKey(oldA, oldB, true) !== pairKey
        )
          fail(
            'Maak voor een ander paar een nieuw partnerschap, of maak eerst de kinderenlijst leeg. Zo worden kinderen niet onbedoeld aan andere ouders gekoppeld.',
          )
        const family = await readFamilyRelations(req),
          ownId = originalDoc?.id == null ? undefined : String(originalDoc.id)
        if (
          family.partnerships.some(
            (p) => p.id !== ownId && relationKey(p.personA, p.personB, true) === pairKey,
          )
        )
          fail('Dit partnerschap bestaat al, ook in omgekeerde volgorde.')
        const pairs = [
          ...family.partnerships.filter((p) => p.id !== ownId),
          {
            id: ownId ?? 'new',
            personA,
            personB,
            children,
            status: data.status ?? originalDoc?.status ?? 'unknown',
          },
        ]
        const cycle = ancestryCycleError(effectiveParentages(family.manual, pairs))
        if (cycle) fail(cycle)
        return {
          ...data,
          personA: Number(personA),
          personB: Number(personB),
          children: children.map(Number),
          pairKey,
          title: `${first.name} & ${second.name}`,
        }
      },
    ],
  },
  fields: [
    {
      name: 'title',
      label: 'Partnerschap',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
        description: 'Wordt automatisch samengesteld uit de namen van beide personen.',
      },
    },
    {
      name: 'personA',
      label: 'Eerste persoon',
      type: 'relationship',
      relationTo: 'people',
      required: true,
    },
    {
      name: 'personB',
      label: 'Tweede persoon',
      type: 'relationship',
      relationTo: 'people',
      required: true,
    },
    {
      name: 'children',
      label: 'Gezamenlijke kinderen',
      type: 'relationship',
      relationTo: 'people',
      hasMany: true,
      defaultValue: [],
      admin: {
        isSortable: true,
        description:
          'Selecteer ieder gezamenlijk kind één keer. De stamboom toont kinderen van oudste naar jongste. Versleep de namen in deze lijst voor de volgorde bij ontbrekende of gelijke geboortedatums. Elk kind wordt met beide partners verbonden. Verwijderen haalt beide koppelingen weg, behalve eventueel apart vastgelegd ouderschap.',
      },
    },
    {
      name: 'status',
      label: 'Relatiestatus',
      type: 'select',
      required: true,
      defaultValue: 'unknown',
      options: [
        { label: 'Onbekend', value: 'unknown' },
        { label: 'Huidig', value: 'current' },
        { label: 'Beëindigd', value: 'ended' },
      ],
    },
    pairKey,
  ],
}
