import { FamilyTree } from '@/components/FamilyTree'
import { demoFamily } from '@/lib/demo'
export const metadata = { title: 'Nieuwe indeling · Familie Zuurbier' }
export default function Page() {
  return <FamilyTree family={demoFamily} demo layoutVariant="upward" />
}
