import { requireSiteModule } from '@/lib/site-modules'
import { sitePageMetadata } from '@/lib/get-site-settings'
import { loadFamily } from '@/lib/load-family'
import { mapboxToken } from '@/lib/mapbox-token'
import { FamilyUnavailable } from '@/components/FamilyUnavailable'
import { FamilyMap } from '@/components/FamilyMap'
import { GoogleTagManager } from '@/components/GoogleTagManager'
export const dynamic = 'force-dynamic'
export default async function Page() {
  await requireSiteModule('map')
  const result = await loadFamily()
  if (result.kind !== 'ready') return <FamilyUnavailable kind={result.kind} />
  return (
    <>
      <GoogleTagManager />
      <FamilyMap
        family={result.family}
        demo={result.demo}
        token={mapboxToken()}
        treeHref="/"
        mapHref="/kaart"
        viewer={result.viewer}
      />
    </>
  )
}

export const generateMetadata = () => sitePageMetadata('map')
