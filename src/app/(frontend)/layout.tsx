import type { Metadata } from 'next'
import './globals.css'
import { getSiteSettings, sitePageMetadata } from '@/lib/get-site-settings'
import { moduleKeys, siteText, siteVariables } from '@/lib/site-settings'
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider'
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const first = moduleKeys.find((key) => settings.pages[key].enabled) ?? 'tree'
  return {
    ...(await sitePageMetadata(first)),
    description: siteText(settings.identity.description, settings),
    robots: { index: false, follow: false },
    ...(settings.icon ? { icons: { icon: settings.icon, apple: settings.icon } } : {}),
  }
}
export default async function Layout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()
  return (
    <html lang="nl" style={siteVariables(settings)}>
      <body>
        <SiteSettingsProvider settings={settings}>{children}</SiteSettingsProvider>
      </body>
    </html>
  )
}
