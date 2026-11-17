import { notFound } from 'next/navigation'
import { InteractionCheck } from '../../interaction-check/test-client'
export const dynamic = 'force-dynamic'
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>
}) {
  if (process.env.NODE_ENV !== 'development') notFound()
  const { variant } = await searchParams
  return <InteractionCheck source={variant === 'classic' ? '/voorbeeld' : '/voorvertoning'} />
}
