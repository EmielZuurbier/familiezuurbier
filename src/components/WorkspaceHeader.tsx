'use client'
import type { ComponentProps, ReactNode } from 'react'
import { ViewNavigation } from './ViewNavigation'
import { useSiteSettings } from './SiteSettingsProvider'
import { siteText } from '@/lib/site-settings'

export function WorkspaceHeader({
  title,
  children,
  ...navigation
}: ComponentProps<typeof ViewNavigation> & { title: string; children?: ReactNode }) {
  const settings = useSiteSettings()
  return (
    <header className="workspace-header">
      <div className="workspace-header-info">
        <div>
          <span className="eyebrow">{siteText(settings.shared.workspaceEyebrow, settings)}</span>
          <h2>{siteText(settings.pages[navigation.active].workspaceTitle || title, settings)}</h2>
        </div>
        {children && <div className="workspace-header-extras">{children}</div>}
      </div>
      <ViewNavigation {...navigation} />
    </header>
  )
}
