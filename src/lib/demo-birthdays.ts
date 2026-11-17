import { demoFamily } from './demo'
import type { Family } from './types'
// Invented calendar dates for the already fictitious example. The original demo
// keeps its intentionally partial dates; no private birthdays are copied here.
const dates = [
  [3, 12],
  [8, 7],
  [1, 20],
  [6, 5],
  [11, 17],
  [4, 29],
  [9, 2],
  [12, 15],
  [7, 11],
  [2, 10],
  [5, 23],
  [10, 4],
  [11, 16],
  [11, 16],
]
export const demoBirthdayFamily: Family = {
  ...demoFamily,
  people: demoFamily.people.map((person, i) => ({
    ...person,
    birth: dates[i] ? { ...person.birth, month: dates[i][0], day: dates[i][1] } : person.birth,
  })),
}
