'use client'
import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react'
import { FamilyBrand } from './FamilyBrand'
import { familyBrand } from '@/lib/branding'

const subscribeInvitation = (callback: () => void) => {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}
const invitationSnapshot = () =>
  new URLSearchParams(window.location.hash.slice(1)).get('uitnodiging') || ''
export function FamilyLogin({ mailReady }: { mailReady: boolean }) {
  const [email, setEmail] = useState(''),
    [code, setCode] = useState('')
  const token = useSyncExternalStore(subscribeInvitation, invitationSnapshot, () => '')
  const [normalStep, setStep] = useState<'email' | 'code'>('email')
  const step = token ? 'invite' : normalStep
  const [remember, setRemember] = useState(false),
    [busy, setBusy] = useState(false)
  const [error, setError] = useState(''),
    [message, setMessage] = useState('')
  const [secondsUntilResend, setSecondsUntilResend] = useState(0)
  useEffect(() => {
    if (!secondsUntilResend) return
    const timer = setTimeout(() => setSecondsUntilResend((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsUntilResend])
  async function submit(action: 'request-code' | 'verify-code' | 'accept-invitation') {
    if (busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/familie/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, token, remember }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Het inloggen is niet gelukt.')
      if (action === 'verify-code') {
        window.location.replace('/')
        return
      }
      if (result.email) setEmail(result.email)
      window.history.replaceState(null, '', window.location.pathname)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
      setCode('')
      setStep('code')
      setSecondsUntilResend(60)
      setMessage(result.message)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Er is geen verbinding. Probeer opnieuw.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="family-auth-page">
      <div className="family-auth-card">
        <FamilyBrand fullNavigation />
        <span className="eyebrow">EEN PLEK VOOR DE FAMILIE</span>
        <h1>
          {step === 'invite'
            ? 'Je bent uitgenodigd.'
            : step === 'code'
              ? 'Bekijk je e-mail.'
              : `Welkom bij de familie ${familyBrand.surname}.`}
        </h1>
        <p>
          {step === 'invite'
            ? 'Accepteer je persoonlijke uitnodiging om de stamboom en familiekaart te bekijken. Je krijgt alleen kijkrechten.'
            : step === 'code'
              ? `Als ${email} toegang heeft, ontvang je daar een zescijferige code. De code is tien minuten geldig.`
              : 'Log in met het e-mailadres waarop je bent uitgenodigd. Je ontvangt een eenmalige code; een wachtwoord is niet nodig.'}
        </p>
        {!mailReady && (
          <div className="auth-notice" role="status">
            Inloggen per e-mail wordt nog ingericht. De beheerder moet eerst een e-maildienst
            aansluiten.
          </div>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="auth-message" role="status">
            {message}
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit(
              step === 'invite'
                ? 'accept-invitation'
                : step === 'code'
                  ? 'verify-code'
                  : 'request-code',
            )
          }}
        >
          {step === 'email' && (
            <label>
              E-mailadres
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
              />
            </label>
          )}
          {step === 'code' && (
            <>
              <label>
                Eenmalige code
                <input
                  className="login-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                />
              </label>
              <label className="auth-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Dit is mijn eigen apparaat: onthoud mij 30 dagen
              </label>
            </>
          )}
          <button
            className="primary auth-primary"
            type="submit"
            disabled={busy || (!mailReady && step !== 'code')}
          >
            <Mail size={16} />
            {busy
              ? 'Even geduld…'
              : step === 'invite'
                ? 'Uitnodiging accepteren'
                : step === 'code'
                  ? 'Inloggen'
                  : 'Stuur mij een inlogcode'}
          </button>
        </form>
        {step === 'code' && (
          <div className="auth-secondary">
            <button
              disabled={busy || !mailReady || secondsUntilResend > 0}
              onClick={() => void submit('request-code')}
            >
              {secondsUntilResend > 0
                ? `Nieuwe code over ${secondsUntilResend} seconden`
                : 'Nieuwe code aanvragen'}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setStep('email')
                setCode('')
                setError('')
                setMessage('')
              }}
            >
              <ArrowLeft size={13} />
              Ander e-mailadres
            </button>
            <p>
              Geen e-mail ontvangen? Controleer je ongewenste e-mail. Wacht een minuut voordat je
              een nieuwe code aanvraagt.
            </p>
          </div>
        )}
        <p className="auth-privacy">
          <ShieldCheck size={15} />
          Alleen uitgenodigde familieleden hebben toegang.
        </p>
        <Link className="auth-admin" href="/admin">
          Inloggen als beheerder →
        </Link>
      </div>
    </main>
  )
}
