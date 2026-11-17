import Link from 'next/link'
import { familyBrand } from '@/lib/branding'
export function AdminWelcome() {
  return (
    <section
      style={{
        padding: '24px',
        border: '1px solid var(--theme-elevation-200)',
        borderRadius: 12,
        marginBottom: 32,
      }}
    >
      <h2>Welkom bij de familie {familyBrand.surname}</h2>
      <p>
        1. Voeg personen toe. 2. Open <strong>Partnerschappen</strong> en kies het paar. 3.
        Selecteer hun gezamenlijke kinderen één keer.
      </p>
      <p>
        Losse ouder-kindrelaties zijn er voor uitzonderingen, zoals één bekende ouder. Vul alleen
        bekende datums in. Vink ‘Overleden’ alleen aan wanneer dat bekend is. Wijzigingen
        verschijnen bij het opnieuw openen of vernieuwen van de stamboom.
      </p>
      <Link href="/">← Bekijk de stamboom</Link>
      <p>
        <Link href="/toegang">Familieleden uitnodigen en toegang beheren →</Link>
      </p>
    </section>
  )
}
