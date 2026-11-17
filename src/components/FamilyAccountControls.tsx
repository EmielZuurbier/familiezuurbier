'use client'
import { useEffect, useState } from 'react'
import { LogOut, Users } from 'lucide-react'
export type FamilyViewer = 'administrator' | 'family'
export function FamilyAccountControls({ viewer }: { viewer?: FamilyViewer }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  useEffect(() => {
    if (viewer !== 'family') return
    let stopped = false
    const check = async () => {
      try {
        const response = await fetch('/api/familie/session', { cache: 'no-store' })
        if (!stopped && response.status === 401) window.location.replace('/inloggen')
      } catch {
        /* Offline users cannot fetch new private data. */
      }
    }
    const visible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload()
    }
    const timer = window.setInterval(() => void check(), 30_000)
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('pageshow', restored)
    return () => {
      stopped = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', visible)
      window.removeEventListener('pageshow', restored)
    }
  }, [viewer])
  if (viewer === 'administrator')
    return (
      <a className="admin-link family-access-link" href="/toegang">
        <Users size={16} />
        Familietoegang beheren
      </a>
    )
  if (viewer !== 'family') return null
  return (
    <div className="family-session-controls">
      <span className="family-reader-label">Alleen kijken</span>
      <button
        className="admin-link"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError('')
          try {
            const response = await fetch('/api/familie/logout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: '{}',
            })
            if (!response.ok) throw new Error()
            window.location.replace('/inloggen')
          } catch {
            setError('Uitloggen is niet gelukt. Probeer opnieuw.')
            setBusy(false)
          }
        }}
      >
        <LogOut size={16} />
        {busy ? 'Even geduld…' : 'Uitloggen'}
      </button>
      {error && (
        <span className="auth-error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
