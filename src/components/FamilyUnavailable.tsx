import Link from 'next/link'
import { familyBrand } from '@/lib/branding'

export function FamilyUnavailable({ kind }: { kind: 'private' | 'setup' | 'error' }) {
  const title =
    kind === 'private'
      ? `De familie ${familyBrand.surname} blijft privé`
      : kind === 'setup'
        ? 'Nog even instellen'
        : 'De stamboom is even niet beschikbaar'
  const description =
    kind === 'private'
      ? 'Deze gegevens zijn alleen voor uitgenodigde familieleden. Log in met je e-mailadres om de stamboom en kaart te bekijken.'
      : kind === 'setup'
        ? 'Volg README.md om de database en geheime sleutel in te stellen.'
        : 'De database kon niet worden gelezen. Controleer of PostgreSQL draait en vernieuw daarna de pagina.'
  return (
    <main className="gate">
      <span className="eyebrow">{familyBrand.name.toUpperCase()}</span>
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
