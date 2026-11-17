import Link from 'next/link'
import { GitBranch } from 'lucide-react'
import { familyBrand } from '@/lib/branding'

export function FamilyBrand({ href = '/' }: { href?: string }) {
  return (
    <Link
      className="brand"
      href={href}
      aria-label={`Stamboom van de familie ${familyBrand.surname}`}
    >
      <span className="brand-icon">
        <GitBranch size={23} />
      </span>
      <span className="brand-copy">
        <span>
          familieboom<span className="brand-dot">.</span>
        </span>
        <small>{familyBrand.name}</small>
      </span>
    </Link>
  )
}
