import { FamilyUnavailable } from '@/components/FamilyUnavailable'
import { loadFamily } from '@/lib/load-family'
import { FamilyTree } from '@/components/FamilyTree'
export const dynamic = 'force-dynamic'
export default async function Page() {
  const result = await loadFamily()
  if (result.kind !== 'ready') return <FamilyUnavailable kind={result.kind} />
  return (
    <FamilyTree
      family={result.family}
      demo={result.demo}
      persistent={result.persistent}
      viewer={result.viewer}
    />
  )
}
