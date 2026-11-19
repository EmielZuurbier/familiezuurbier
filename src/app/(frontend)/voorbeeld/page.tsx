import { requireSiteModule } from '@/lib/site-modules'
import { sitePageMetadata } from '@/lib/get-site-settings'
import { FamilyTree } from '@/components/FamilyTree'
import { demoFamily } from '@/lib/demo'
// This route always contains only the bundled fictitious example, never database records.
export default async function Page() {
  await requireSiteModule('tree', '/voorbeeld')
  return <FamilyTree family={demoFamily} demo />
}

export const generateMetadata = () => sitePageMetadata('tree')
