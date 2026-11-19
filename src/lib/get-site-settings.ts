import 'server-only'
import { cache } from 'react'
import { getPayload } from 'payload'
import { databaseConfigured } from './settings'
import { resolveSiteSettings, siteText, type SiteModule } from './site-settings'

// Request-local only: saving settings is visible on the next page load.
export const getSiteSettings = cache(async () => {
  if (!databaseConfigured()) return resolveSiteSettings()
  try {
    const { default: config } = await import('@payload-config')
    const payload = await getPayload({ config })
    return resolveSiteSettings(
      await payload.findGlobal({ slug: 'site-settings', depth: 1, overrideAccess: false }),
    )
  } catch {
    // Public branding may fall back during setup. Access to family data is checked independently.
    return resolveSiteSettings()
  }
})

export async function sitePageMetadata(page: SiteModule | 'login' | 'access') {
  const settings = await getSiteSettings()
  const title =
    page === 'login'
      ? settings.login.pageTitle
      : page === 'access'
        ? settings.admin.accessPageTitle
        : settings.pages[page].pageTitle
  return { title: `${siteText(title, settings)} · ${settings.identity.name}` }
}
