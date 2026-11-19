import Link from 'next/link'
import { getSiteSettings } from '@/lib/get-site-settings'
import { siteText } from '@/lib/site-settings'
export async function AdminWelcome() {
  const settings = await getSiteSettings()
  return (
    <section className="admin-welcome">
      <span className="admin-welcome__eyebrow">{settings.identity.name}</span>
      <h2>{siteText(settings.admin.title, settings)}</h2>
      <p className="admin-welcome__intro">{siteText(settings.admin.introduction, settings)}</p>
      <p>
        1. Voeg personen toe. 2. Open <strong>Partnerschappen</strong> en kies het paar. 3.
        Selecteer hun gezamenlijke kinderen één keer.
      </p>
      <p>
        Losse ouder-kindrelaties zijn er voor uitzonderingen, zoals één bekende ouder. Vul alleen
        bekende datums in. Vink ‘Overleden’ alleen aan wanneer dat bekend is. Wijzigingen
        verschijnen bij het opnieuw openen of vernieuwen van de stamboom.
      </p>
      {settings.pages.events.enabled && (
        <p>
          Bij <strong>Gebeurtenissen</strong> bewaar je verhalen met foto’s en gekoppelde
          familieleden. Gebruik + in de verhaleneditor om blokken toe te voegen.
        </p>
      )}
      <div className="admin-welcome__links">
        <Link href="/">← Bekijk de website</Link>
        <Link href="/toegang">Familieleden uitnodigen en toegang beheren →</Link>
        <Link href="/admin/globals/site-settings">Website-instellingen →</Link>
      </div>
    </section>
  )
}
