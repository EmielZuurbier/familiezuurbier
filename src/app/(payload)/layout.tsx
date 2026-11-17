import Link from 'next/link'
import config from '@payload-config'
import '@payloadcms/next/css'
import type { ServerFunctionClient } from 'payload'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import { importMap } from './admin/importMap'
import { databaseConfigured } from '@/lib/settings'
const serverFunction: ServerFunctionClient = async (args) => {
  'use server'
  if (!databaseConfigured()) throw new Error('Database nog niet ingesteld.')
  return handleServerFunctions({ ...args, config, importMap })
}
export default function Layout({ children }: { children: React.ReactNode }) {
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
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  )
}
