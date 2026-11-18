import { describe, expect, it } from 'vitest'
import { People } from '../src/collections/collections'

const validate = People.hooks!.beforeValidate![0]
const validatePerson = (data: Record<string, unknown>, originalDoc?: Record<string, unknown>) =>
  validate({ data, originalDoc } as Parameters<typeof validate>[0])

describe('Overlijdensdatum zonder plaats van overlijden', () => {
  it('laat oude overlijdensplaatsen het uitzetten van Overleden niet blokkeren', () => {
    expect(
      validatePerson(
        { name: 'Fictieve persoon', lifeStatus: 'unknown' },
        { lifeStatus: 'deceased', deathPlace: 'Oude plaats', death: {} },
      ),
    ).toMatchObject({ lifeStatus: 'unknown' })
  })
  it('houdt de controle op een overgebleven overlijdensdatum met een corrigeerbare melding', () => {
    expect(() =>
      validatePerson(
        { name: 'Fictieve persoon', lifeStatus: 'unknown' },
        { deathPlace: 'Oude plaats', death: { year: 2020 } },
      ),
    ).toThrow('wis dan eerst de overlijdensdatum.')
  })
  it('staat een onbekende overlijdensdatum toe bij een overleden persoon', () => {
    expect(validatePerson({ name: 'Fictieve persoon', lifeStatus: 'deceased' })).toMatchObject({
      lifeStatus: 'deceased',
    })
  })
})
