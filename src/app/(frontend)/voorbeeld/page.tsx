import { FamilyTree } from '@/components/FamilyTree'
import { demoFamily } from '@/lib/demo'
// This route always contains only the bundled fictitious example, never database records.
export default function Page() {
  return <FamilyTree family={demoFamily} demo />
}
