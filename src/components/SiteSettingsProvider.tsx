'use client'
import { createContext, useContext, type ReactNode } from 'react'
import { resolveSiteSettings, type SiteSettings } from '@/lib/site-settings'

const SiteContext = createContext<SiteSettings>(resolveSiteSettings())
export function SiteSettingsProvider({
  settings,
  children,
}: {
  settings: SiteSettings
  children: ReactNode
}) {
  return <SiteContext.Provider value={settings}>{children}</SiteContext.Provider>
}
export const useSiteSettings = () => useContext(SiteContext)
