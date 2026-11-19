import Link from 'next/link'
import config from '@payload-config'
import '@payloadcms/next/css'
import '@/components/admin/admin.scss'
import { getSiteSettings } from '@/lib/get-site-settings'
import { siteVariables } from '@/lib/site-settings'
import type { ServerFunctionClient } from 'payload'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import { importMap } from './admin/importMap'
import { databaseConfigured } from '@/lib/settings'
const serverFunction: ServerFunctionClient = async (args) => {
  'use server'
  if (!databaseConfigured()) throw new Error('Database nog niet ingesteld.')
  return handleServerFunctions({ ...args, config, importMap })
}
export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!databaseConfigured())
    return (
      <html lang="nl">
        <body
          style={{
            fontFamily: 'system-ui',
            padding: '10vw',
            background: '#f6f5ef',
            color: '#223b30',
          }}
        >
          <h1>Beheer instellen</h1>
          <p>Voor beheer zijn PostgreSQL, een geheime sleutel en een eerste beheerder nodig.</p>
          <p>Volg de lokale installatie in README.md in de projectmap.</p>
          <Link href="/">← Terug naar de stamboom</Link>
        </body>
      </html>
    )
  const settings = await getSiteSettings()
  return (
    <RootLayout
      htmlProps={{ style: siteVariables(settings), className: 'family-admin' }}
      config={config}
      importMap={importMap}
      serverFunction={serverFunction}
    >
      {children}
    </RootLayout>
  )
}
