'use client'
import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSiteSettings } from './SiteSettingsProvider'
import { siteText } from '@/lib/site-settings'
import { FamilyBrand } from './FamilyBrand'
import Link from 'next/link'
import { ArrowLeft, Mail, ShieldCheck, UserPlus } from 'lucide-react'
type Member = {
  id: number
  name: string
  email: string
  status: 'invited' | 'active' | 'revoked'
  invitedAt?: string | null
  lastLoginAt?: string | null
  mailFailed?: boolean | null
}
export function FamilyAccessManager({
  members,
  mailReady,
}: {
  members: Member[]
  mailReady: boolean
}) {
  const settings = useSiteSettings()
  const router = useRouter()
  const fieldId = useId()
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('')
  async function action(kind: 'invite' | 'revoke', data: object) {
    if (busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/familie/${kind}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }),
        result = await response.json()
      if (!response.ok) throw new Error(result.message || 'De wijziging is niet gelukt.')
      setMessage(result.message)
      if (kind === 'invite') {
        setName('')
        setEmail('')
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Er is geen verbinding. Probeer opnieuw.')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="family-access-page">
      <header>
        <div className="family-access-topbar">
          <FamilyBrand />
          <Link className="family-access-back" href="/admin">
            <ArrowLeft size={15} aria-hidden="true" />
            Terug naar het beheer
          </Link>
        </div>
        <span className="eyebrow">{siteText(settings.admin.accessEyebrow, settings)}</span>
        <h1>{siteText(settings.admin.accessTitle, settings)}</h1>
        <p>{siteText(settings.admin.accessDescription, settings)}</p>
      </header>
      {!mailReady && (
        <div className="auth-notice" role="status">
          <strong>E-mail is nog niet aangesloten.</strong>
          <p>
            De inlogschermen en familieaccounts staan klaar. Sluit een e-maildienst aan om
            persoonlijke uitnodigingen en inlogcodes te versturen.
          </p>
        </div>
      )}
      <section className="invite-card">
        <h2>
          <UserPlus size={21} />
          Familielid uitnodigen
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void action('invite', { name, email })
          }}
        >
          <div className="invite-field">
            <label htmlFor={`${fieldId}-name`}>Naam</label>
            <div className="invite-input">
              <input
                id={`${fieldId}-name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
                autoComplete="name"
              />
            </div>
          </div>
          <div className="invite-field">
            <label htmlFor={`${fieldId}-email`}>E-mailadres</label>
            <div className="invite-input">
              <input
                id={`${fieldId}-email`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
                required
                autoComplete="email"
              />
            </div>
          </div>
          <button className="primary" disabled={busy || !mailReady}>
            <Mail size={15} />
            Uitnodiging versturen
          </button>
        </form>
        <p>
          De uitnodiging is zeven dagen geldig. Het familielid accepteert die één keer en logt
          daarna in met een eenmalige e-mailcode.
        </p>
      </section>
      {error && (
        <p role="alert" className="auth-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="auth-message">
          {message}
        </p>
      )}
      <section className="members-card">
        <h2>
          <ShieldCheck size={21} />
          Familieaccounts <span>{members.length}</span>
        </h2>
        {!members.length ? (
          <p>Er zijn nog geen familieleden uitgenodigd.</p>
        ) : (
          <ul>
            {members.map((member) => (
              <li key={member.id}>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.email}</span>
                  <small className={`member-status status-${member.status}`}>
                    {member.status === 'active'
                      ? 'Heeft toegang · alleen kijken'
                      : member.status === 'revoked'
                        ? 'Toegang ingetrokken'
                        : member.mailFailed
                          ? 'E-mail niet verstuurd'
                          : member.invitedAt
                            ? 'Uitnodiging verstuurd'
                            : 'Nog niet verstuurd'}
                  </small>
                </div>
                <div className="member-actions">
                  {member.status !== 'active' && (
                    <button
                      disabled={busy || !mailReady}
                      onClick={() =>
                        void action('invite', { name: member.name, email: member.email })
                      }
                    >
                      {member.status === 'revoked'
                        ? 'Opnieuw uitnodigen'
                        : 'Uitnodiging opnieuw sturen'}
                    </button>
                  )}
                  {member.status !== 'revoked' && (
                    <button
                      disabled={busy}
                      className="revoke-button"
                      onClick={() => void action('revoke', { id: member.id })}
                    >
                      Toegang intrekken
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
