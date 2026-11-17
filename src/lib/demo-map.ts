import { demoFamily } from './demo'
import type { Family } from './types'

// Fictitious residences for the public map example; no database records are used.
const places = [
  'Haarlem, Nederland',
  'Haarlem, Nederland',
  'Utrecht, Nederland',
  'Utrecht, Nederland',
  'Leiden, Nederland',
  'Leiden, Nederland',
  'Amsterdam, Nederland',
  'Amsterdam, Nederland',
  'Gent, België',
  'Gent, België',
  'Groningen, Nederland',
  'Groningen, Nederland',
  'Amsterdam, Nederland',
]
export const demoMapFamily: Family = {
  ...demoFamily,
  people: demoFamily.people.map((person, i) => ({
    ...person,
    currentResidence: places[i] ?? null,
  })),
}
