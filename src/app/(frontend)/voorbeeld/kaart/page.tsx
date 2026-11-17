import { FamilyMap } from '@/components/FamilyMap'
import { demoMapFamily } from '@/lib/demo-map'
import { mapboxToken } from '@/lib/mapbox-token'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Voorbeeldkaart · Familie Zuurbier' }
export default function Page() {
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
