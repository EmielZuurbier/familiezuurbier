'use client'
import { useState } from 'react'
import type { Person } from '@/lib/types'

export function LifeStatusIcon({
  status,
  interactive = false,
  descriptionId,
}: {
  status: Person['lifeStatus']
  interactive?: boolean
  descriptionId?: string
}) {
  const [open, setOpen] = useState(false)
  if (status !== 'deceased') return null
  const label = 'Overleden'
  const className = `life-status-icon life-status-${status}${open ? ' is-open' : ''}`
  const content = (
    <>
      <span className="life-status-dagger" aria-hidden="true">
        †
      </span>
      <span className="life-status-tooltip" id={descriptionId} aria-hidden="true">
        {label}
      </span>
    </>
  )
  return interactive ? (
    <button
      type="button"
      className={className}
      aria-label={label}
      onClick={() => setOpen((value) => !value)}
      onBlur={() => setOpen(false)}
    >
      {content}
    </button>
  ) : (
    <span className={className} role="img" aria-label={label}>
      {content}
    </span>
  )
}
