import type { ComponentProps, ReactNode } from 'react'
import { ViewNavigation } from './ViewNavigation'

export function WorkspaceHeader({
  title,
  children,
  ...navigation
}: ComponentProps<typeof ViewNavigation> & { title: string; children?: ReactNode }) {
  return (
    <header className="workspace-header">
      <div className="workspace-header-info">
        <div>
          <span className="eyebrow">FAMILIEOVERZICHT</span>
          <h2>{title}</h2>
        </div>
        {children && <div className="workspace-header-extras">{children}</div>}
      </div>
      <ViewNavigation {...navigation} />
    </header>
  )
}
