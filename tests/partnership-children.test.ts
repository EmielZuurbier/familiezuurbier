import { describe, it, expect } from 'vitest'
import {
  effectiveParentages,
  ancestryCycleError,
  planPartnershipChildren,
  relationKey,
} from '../src/lib/relations'
import type { Parentage, Partnership } from '../src/lib/types'
const pair = (id: string, a: string, b: string, children: string[] = []): Partnership => ({
  id,
  personA: a,
  personB: b,
  children,
  status: 'unknown',
})
const edge = (id: string, parent: string, child: string): Parentage => ({ id, parent, child })
const keys = (edges: Parentage[]) => edges.map((r) => relationKey(r.parent, r.child)).sort()
describe('gezamenlijke kinderen per partnerschap', () => {
  it('verbindt één geselecteerd kind met beide partners', () => {
    expect(keys(effectiveParentages([], [pair('1', 'a', 'b', ['c'])]))).toEqual(['a:c', 'b:c'])
  })
  it('houdt kinderen per partnerschap en telt een gedeelde ouder niet dubbel', () => {
    expect(
      keys(
        effectiveParentages(
          [edge('manual', 'a', 'c')],
          [pair('1', 'a', 'b', ['c']), pair('2', 'a', 'd', ['e', 'c'])],
        ),
      ),
    ).toEqual(['a:c', 'a:e', 'b:c', 'd:c', 'd:e'])
  })
  it('houdt expliciet los ouderschap over als een gezamenlijk kind wordt verwijderd', () => {
    expect(effectiveParentages([edge('m', 'a', 'c')], [pair('1', 'a', 'b', [])])).toEqual([
      edge('m', 'a', 'c'),
    ])
  })
  it('ontdekt cirkels met zowel gezamenlijke als afzonderlijke koppelingen', () => {
    expect(
      ancestryCycleError(effectiveParentages([edge('m', 'c', 'a')], [pair('1', 'a', 'b', ['c'])])),
    ).toContain('cirkel')
    expect(
      ancestryCycleError(
        effectiveParentages([], [pair('1', 'a', 'b', ['c']), pair('2', 'c', 'd', ['a'])]),
      ),
    ).toContain('cirkel')
    expect(ancestryCycleError(effectiveParentages([], [pair('1', 'a', 'b', ['a'])]))).toContain(
      'eigen',
    )
    expect(
      ancestryCycleError(effectiveParentages([], [pair('1', 'a', 'b', ['c'])])),
    ).toBeUndefined()
  })
})
describe('behoud van bestaande relaties bij omzetting', () => {
  it('zet uitsluitend twee vastgelegde ouders met precies één passend partnerschap om', () => {
    const manual = [edge('1', 'a', 'c'), edge('2', 'b', 'c'), edge('3', 'a', 'd')],
      pairs = [pair('p', 'a', 'b')]
    const plan = planPartnershipChildren(manual, pairs)
    expect(plan.children).toBe(1)
    expect(plan.removeIds).toEqual(['1', '2'])
    expect(plan.updates).toEqual([{ id: 'p', children: ['c'] }])
    expect(plan.unresolved).toBe(1)
    expect(keys(effectiveParentages(manual, pairs))).toEqual(
      keys(
        effectiveParentages(
          manual.filter((r) => !plan.removeIds.includes(r.id)),
          [pair('p', 'a', 'b', ['c'])],
        ),
      ),
    )
  })
  it('raadt geen tweede ouder en laat drie ouders of meerdere passende paren ongemoeid', () => {
    const manual = [edge('1', 'a', 'c'), edge('2', 'b', 'c'), edge('3', 'd', 'c')]
    expect(planPartnershipChildren(manual, [pair('p', 'a', 'b')]).children).toBe(0)
    expect(planPartnershipChildren(manual.slice(0, 1), [pair('p', 'a', 'b')]).children).toBe(0)
    expect(
      planPartnershipChildren(manual.slice(0, 2), [pair('p', 'a', 'b'), pair('q', 'b', 'a')])
        .children,
    ).toBe(0)
  })
  it('laat al bewust gecombineerd los en gezamenlijk ouderschap staan', () => {
    const manual = [edge('1', 'a', 'c'), edge('2', 'b', 'c')]
    expect(planPartnershipChildren(manual, [pair('p', 'a', 'b', ['c'])]).removeIds).toEqual([])
  })
  it('blijft na omzetting zonder verdere wijzigingen herhaalbaar', () => {
    expect(planPartnershipChildren([], [pair('p', 'a', 'b', ['c'])]).updates).toEqual([])
  })
})
