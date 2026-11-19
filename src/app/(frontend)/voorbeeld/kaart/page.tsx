import { requireSiteModule } from '@/lib/site-modules'
import { sitePageMetadata } from '@/lib/get-site-settings'
import { FamilyMap } from '@/components/FamilyMap'
import { demoMapFamily } from '@/lib/demo-map'
import { mapboxToken } from '@/lib/mapbox-token'
export const dynamic = 'force-dynamic'
export default async function Page() {
  await requireSiteModule('map', '/voorbeeld')
  return (
    <FamilyMap
      family={demoMapFamily}
      demo
      token={mapboxToken()}
      treeHref="/voorbeeld"
      mapHref="/voorbeeld/kaart"
    />
  )
}

export const generateMetadata = () => sitePageMetadata('map')
