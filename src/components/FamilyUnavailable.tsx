import Link from 'next/link'
import { getSiteSettings } from '@/lib/get-site-settings'
import { siteText } from '@/lib/site-settings'
import { FamilyBrand } from './FamilyBrand'

export async function FamilyUnavailable({ kind }: { kind: 'private' | 'setup' | 'error' }) {
  const settings = await getSiteSettings()
  const title =
    kind === 'private'
      ? siteText(settings.login.privateTitle, settings)
      : kind === 'setup'
        ? 'Nog even instellen'
        : 'De stamboom is even niet beschikbaar'
  const description =
    kind === 'private'
      ? siteText(settings.login.privateDescription, settings)
      : kind === 'setup'
        ? 'Volg README.md om de database en geheime sleutel in te stellen.'
        : 'De database kon niet worden gelezen. Controleer of PostgreSQL draait en vernieuw daarna de pagina.'
  return (
    <main className="gate">
      <FamilyBrand fullNavigation />
      <span className="eyebrow">{settings.identity.name.toUpperCase()}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <a className="primary" href={kind === 'private' ? '/inloggen' : '/admin'}>
        {kind === 'private' ? 'Inloggen bij de familie →' : 'Inloggen bij het beheer →'}
      </a>
      {kind === 'private' && (
        <p>
          <Link href="/admin">Inloggen als beheerder →</Link>
        </p>
      )}
    </main>
  )
}
