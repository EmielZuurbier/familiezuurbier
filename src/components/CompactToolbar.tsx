'use client'
import { useId, useState, type ReactNode } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'

/** Keeps the desktop controls in place, with one expandable row on small screens. */
export function CompactToolbar({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="compact-toolbar">
      <button
        type="button"
        className="compact-toolbar-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={id}
      >
        <SlidersHorizontal size={15} aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      <div id={id} className={`compact-toolbar-content${open ? ' is-open' : ''}`}>
        {children}
      </div>
    </div>
  )
}
