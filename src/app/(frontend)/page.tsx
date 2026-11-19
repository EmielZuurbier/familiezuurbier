import { requireSiteModule } from '@/lib/site-modules'
import { sitePageMetadata } from '@/lib/get-site-settings'
import { FamilyUnavailable } from '@/components/FamilyUnavailable'
import { loadFamily } from '@/lib/load-family'
import { FamilyTree } from '@/components/FamilyTree'
import { GoogleTagManager } from '@/components/GoogleTagManager'
export const dynamic = 'force-dynamic'
export default async function Page() {
  await requireSiteModule('tree')
  const result = await loadFamily()
  if (result.kind !== 'ready') return <FamilyUnavailable kind={result.kind} />
  return (
    <>
      <GoogleTagManager />
      <FamilyTree
        family={result.family}
        demo={result.demo}
        persistent={result.persistent}
        viewer={result.viewer}
      />
    </>
  )
}

export const generateMetadata = () => sitePageMetadata('tree')
