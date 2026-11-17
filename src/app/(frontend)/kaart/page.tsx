import { loadFamily } from '@/lib/load-family'
import { mapboxToken } from '@/lib/mapbox-token'
import { FamilyUnavailable } from '@/components/FamilyUnavailable'
import { FamilyMap } from '@/components/FamilyMap'
import { familyPageTitle } from '@/lib/branding'
export const dynamic = 'force-dynamic'
export const metadata = { title: familyPageTitle('Familie op de kaart') }
export default async function Page() {
  const result = await loadFamily()
  if (result.kind !== 'ready') return <FamilyUnavailable kind={result.kind} />
  return (
    <FamilyMap
      family={result.family}
      demo={result.demo}
      token={mapboxToken()}
      treeHref="/"
      mapHref="/kaart"
      viewer={result.viewer}
    />
  )
}
