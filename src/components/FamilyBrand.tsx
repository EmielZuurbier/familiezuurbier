'use client'
import Link from 'next/link'
import { GitBranch } from 'lucide-react'
import { useSiteSettings } from './SiteSettingsProvider'
import { siteText } from '@/lib/site-settings'
import Image from 'next/image'

export function FamilyBrand({
  href = '/',
  fullNavigation = false,
}: {
  href?: string
  fullNavigation?: boolean
}) {
  const settings = useSiteSettings()
  const content = (
    <>
      <span className="brand-icon">
        {settings.logo ? (
          <Image
            unoptimized
            src={settings.logo}
            width={38}
            height={38}
            alt={siteText(settings.identity.logoAlt, settings)}
            className="brand-image"
          />
        ) : (
          <GitBranch size={23} />
        )}
      </span>
      <span className="brand-copy">
        <span>
          {settings.identity.wordmark}
          {settings.identity.showDot && <span className="brand-dot">.</span>}
        </span>
        <small>{settings.identity.name}</small>
      </span>
    </>
  )
  const label = settings.identity.name
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
