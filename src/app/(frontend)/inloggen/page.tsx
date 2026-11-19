import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { FamilyLogin } from '@/components/FamilyLogin'
import { databaseConfigured } from '@/lib/settings'
import { mailConfigured } from '@/lib/family-auth/mail'
import { sitePageMetadata } from '@/lib/get-site-settings'
export const dynamic = 'force-dynamic'
export const generateMetadata = () => sitePageMetadata('login')
export default async function Page() {
  if (databaseConfigured()) {
    const payload = await getPayload({ config }),
      { user } = await payload.auth({ headers: await headers() })
    if (user?.collection === 'family-members' && user.status === 'active') redirect('/')
  }
  return <FamilyLogin mailReady={mailConfigured()} />
}
