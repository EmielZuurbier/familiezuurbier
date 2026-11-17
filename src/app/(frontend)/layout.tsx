import type { Metadata } from 'next'
import './globals.css'
import { familyBrand } from '@/lib/branding'
export const metadata: Metadata = {
  title: `${familyBrand.name} · Onze stamboom`,
  description: familyBrand.description,
  robots: { index: false, follow: false },
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  )
}
