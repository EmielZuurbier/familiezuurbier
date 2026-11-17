import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { examplesAvailable } from '@/lib/load-family'

export const dynamic = 'force-dynamic'
export default async function Layout({ children }: { children: ReactNode }) {
  if (!(await examplesAvailable())) notFound()
  return children
}
