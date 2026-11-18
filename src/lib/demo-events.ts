import type { FamilyEvent } from './events/types'
const photo = {
  url: '/demo/familieverhaal.svg',
  alt: 'Fictieve illustratie van een familiepicknick',
  width: 1000,
  height: 560,
}
export const demoEvents: FamilyEvent[] = [
  {
    id: 'voorbeeld-familiedag',
    title: 'Een lange tafel in het groen',
    date: { year: 2026, month: 6, day: 21 },
    place: 'Haarlem, Nederland',
    people: ['3', '4', '7', '8', '13', '14'],
    cover: photo,
    images: { '1001': photo },
    excerpt: 'Van zelfgebakken taart tot oude verhalen: een middag die we graag bewaren.',
    story: {
      version: 1,
      blocks: [
        {
          name: 'core/paragraph',
          attributes: {
            content:
              'Van zelfgebakken taart tot oude verhalen: een middag die we graag bewaren. Dit is een <strong>volledig fictief voorbeeld</strong> van een familieverhaal.',
          },
          innerBlocks: [],
        },
        {
          name: 'core/heading',
          attributes: { content: 'Iedereen schoof aan', level: 2 },
          innerBlocks: [],
        },
        {
          name: 'core/paragraph',
          attributes: {
            content:
              'De tafel werd steeds langer en de gesprekken liepen vanzelf. De jongste generatie maakte nieuwe herinneringen, terwijl de oudere generatie oude herinneringen deelde.',
          },
          innerBlocks: [],
        },
        {
          name: 'familie/image',
          attributes: {
            mediaId: 1001,
            caption: 'Een verzonnen middag, als voorbeeld van een foto met bijschrift.',
            alt: photo.alt,
          },
          innerBlocks: [],
        },
        {
          name: 'core/quote',
          attributes: { citation: 'Een fictieve herinnering' },
          innerBlocks: [
            {
              name: 'core/paragraph',
              attributes: { content: 'Het mooiste was dat we er allemaal even waren.' },
              innerBlocks: [],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'voorbeeld-verhuizing',
    title: 'Een nieuw thuis in Leiden',
    date: { year: 1982, month: 9 },
    place: 'Leiden, Nederland',
    people: ['5', '6', '11'],
    images: {},
    excerpt: 'Over verhuisdozen, een nieuwe voordeur en het begin van een nieuw hoofdstuk.',
    story: {
      version: 1,
      blocks: [
        {
          name: 'core/paragraph',
          attributes: {
            content:
              'Over verhuisdozen, een nieuwe voordeur en het begin van een nieuw hoofdstuk. Een verzonnen verhaal om te laten zien hoe ook een maand zonder precieze dag kan worden vastgelegd.',
          },
          innerBlocks: [],
        },
      ],
    },
  },
  {
    id: 'voorbeeld-onbekend',
    title: 'Het recept dat altijd meeging',
    date: {},
    people: ['1', '2', '3', '5'],
    images: {},
    excerpt: 'Sommige herinneringen hebben geen datum nodig om bij de familie te horen.',
    story: {
      version: 1,
      blocks: [
        {
          name: 'core/paragraph',
          attributes: {
            content:
              'Sommige herinneringen hebben geen datum nodig om bij de familie te horen. Dit fictieve verhaal laat zien hoe een ongedateerde gebeurtenis wordt bewaard.',
          },
          innerBlocks: [],
        },
      ],
    },
  },
]
