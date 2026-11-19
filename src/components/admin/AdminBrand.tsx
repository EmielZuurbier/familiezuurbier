import Image from 'next/image'
import Link from 'next/link'
import { GitBranch } from 'lucide-react'
import { getSiteSettings } from '@/lib/get-site-settings'
import { siteText } from '@/lib/site-settings'

export async function AdminLogo() {
  const settings = await getSiteSettings()
  return (
    <div className="admin-brand" aria-label={settings.identity.name}>
      <span className="admin-brand__symbol">
        {settings.logo ? (
          <Image
            unoptimized
            src={settings.logo}
            width={44}
            height={44}
            alt={siteText(settings.identity.logoAlt, settings)}
          />
        ) : (
          <GitBranch size={27} strokeWidth={1.6} />
        )}
      </span>
      <span className="admin-brand__copy">
        <strong>
          {settings.identity.wordmark}
          {settings.identity.showDot && <span>.</span>}
        </strong>
        <small>{settings.identity.name}</small>
      </span>
    </div>
  )
}
export async function AdminIcon() {
  const settings = await getSiteSettings()
  return (
    <span className="admin-brand-icon" aria-label={settings.identity.name}>
      {settings.logo ? (
        <Image
          unoptimized
          src={settings.logo}
          width={18}
          height={18}
          alt={siteText(settings.identity.logoAlt, settings)}
        />
      ) : (
        <GitBranch size={14} strokeWidth={1.6} />
      )}
    </span>
  )
}
export function AdminNavBrand() {
  return (
    <Link className="admin-nav-brand" href="/admin">
      <AdminLogo />
    </Link>
  )
}
export async function AdminLoginWelcome() {
  const settings = await getSiteSettings()
  return (
    <div className="admin-login-welcome">
      <span>BEHEER</span>
      <h1>{siteText(settings.admin.loginTitle, settings)}</h1>
      <p>{siteText(settings.admin.loginDescription, settings)}</p>
    </div>
  )
}
