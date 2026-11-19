import { requireSiteModule } from '@/lib/site-modules'
import { sitePageMetadata } from '@/lib/get-site-settings'
import { FamilyTree } from '@/components/FamilyTree'
import { demoFamily } from '@/lib/demo'
export default async function Page() {
  await requireSiteModule('tree', '/voorvertoning')
  return <FamilyTree family={demoFamily} demo layoutVariant="upward" />
}

export const generateMetadata = () => sitePageMetadata('tree')
