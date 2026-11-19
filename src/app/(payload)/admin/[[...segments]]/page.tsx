import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '../importMap'
import { databaseConfigured } from '@/lib/settings'
import { getSiteSettings } from '@/lib/get-site-settings'
type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}
export const generateMetadata = async ({ params, searchParams }: Args): Promise<Metadata> => {
  const settings = await getSiteSettings()
  const meta = databaseConfigured()
    ? await generatePageMetadata({ config, params, searchParams })
    : { title: 'Beheer instellen' }
  const title = typeof meta.title === 'string' ? meta.title.replace(/ \| Beheer$/, '') : 'Beheer'
  return {
    ...meta,
    title: `${title} | ${settings.identity.name}`,
    ...(settings.icon ? { icons: { icon: settings.icon } } : {}),
  }
}
export default async function Page({ params, searchParams }: Args) {
  if (!databaseConfigured()) return null
  const payload = await getPayload({ config })
  const count = await payload.count({ collection: 'administrators', overrideAccess: true })
  if (!count.totalDocs)
    return (
      <section style={{ maxWidth: 620, margin: '10vh auto', padding: 30 }}>
        <h1>Maak je eerste beheerder</h1>
        <p>De database is verbonden. Kies je eigen account lokaal in de terminal met:</p>
        <pre>npm run admin:create</pre>
        <p>
          Ververs deze pagina nadat het account is aangemaakt. Daarna beheer je hier personen en
          familiebanden.
        </p>
        <Link href="/">← Bekijk de stamboom</Link>
      </section>
    )
  return RootPage({ config, params, searchParams, importMap })
}
