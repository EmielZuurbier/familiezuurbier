import { headers } from 'next/headers'
import { getPayload } from 'payload'
import Link from 'next/link'
import config from '@payload-config'
import { FamilyAccessManager } from '@/components/FamilyAccessManager'
import { listMembers } from '@/lib/family-auth/service'
import { mailConfigured } from '@/lib/family-auth/mail'
import { sitePageMetadata } from '@/lib/get-site-settings'
export const dynamic = 'force-dynamic'
export const generateMetadata = () => sitePageMetadata('access')
export default async function Page() {
  const payload = await getPayload({ config }),
    { user } = await payload.auth({ headers: await headers() })
  if (user?.collection !== 'administrators')
    return (
      <main className="gate">
        <span className="eyebrow">FAMILIETOEGANG</span>
        <h1>Alleen voor beheerders</h1>
        <p>
          Familieleden kunnen de stamboom bekijken. Alleen een beheerder kan uitnodigingen en
          toegang beheren.
        </p>
        <Link className="primary" href="/admin">
          Inloggen als beheerder →
        </Link>
        <p>
          <Link href="/">Naar de stamboom</Link>
        </p>
      </main>
    )
  return (
    <FamilyAccessManager members={await listMembers(payload, user)} mailReady={mailConfigured()} />
  )
}
