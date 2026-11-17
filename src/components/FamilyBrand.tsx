import Link from 'next/link'
import { GitBranch } from 'lucide-react'
import { familyBrand } from '@/lib/branding'

export function FamilyBrand({
  href = '/',
  fullNavigation = false,
}: {
  href?: string
  fullNavigation?: boolean
}) {
  const content = (
    <>
      <span className="brand-icon">
        <GitBranch size={23} />
      </span>
      <span className="brand-copy">
        <span>
          familieboom<span className="brand-dot">.</span>
        </span>
        <small>{familyBrand.name}</small>
      </span>
    </>
  )
  const label = `Stamboom van de familie ${familyBrand.surname}`
  if (fullNavigation)
    return (
      <a className="brand" href={href} aria-label={label}>
        {content}
      </a>
    )
  return (
    <Link className="brand" href={href} aria-label={label}>
      {content}
    </Link>
  )
}
