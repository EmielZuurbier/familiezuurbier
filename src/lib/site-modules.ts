import { notFound, redirect } from 'next/navigation'
import { getSiteSettings } from './get-site-settings'
import { firstModulePath, type SiteModule } from './site-settings'

export async function requireSiteModule(module: SiteModule, base = '') {
  const settings = await getSiteSettings()
  if (!settings.pages[module].enabled) {
    if (module === 'tree') redirect(firstModulePath(settings, base))
    notFound()
  }
}
