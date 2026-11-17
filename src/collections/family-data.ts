import type { PayloadRequest } from 'payload'
import type { Parentage, Partnership } from '../lib/types'
export function relationshipId(value: unknown): string {
  return String(typeof value === 'object' && value !== null && 'id' in value ? value.id : value)
}
export async function readFamilyRelations(
  req: PayloadRequest,
): Promise<{ manual: Parentage[]; partnerships: Partnership[] }> {
  const [parents, pairs] = await Promise.all([
    req.payload.find({
      collection: 'parentages',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    }),
    req.payload.find({
      collection: 'partnerships',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    }),
  ])
  return {
    manual: parents.docs.map((r) => ({
      id: String(r.id),
      parent: relationshipId(r.parent),
      child: relationshipId(r.child),
    })),
    partnerships: pairs.docs.map((r) => ({
      id: String(r.id),
      personA: relationshipId(r.personA),
      personB: relationshipId(r.personB),
      status: r.status,
      children: (r.children ?? []).map(relationshipId),
    })),
  }
}
