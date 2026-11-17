'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Flower2, Heart, Star, Sun, TreeDeciduous, UserRound } from 'lucide-react'
import type { Person } from '@/lib/types'

const icons = {
  person: UserRound,
  tree: TreeDeciduous,
  flower: Flower2,
  sun: Sun,
  star: Star,
  heart: Heart,
}
const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .filter((_, i, words) => i === 0 || i === words.length - 1)
    .join('')

export function PersonAvatar({
  person,
  className = 'avatar',
}: {
  person: Person
  className?: string
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const choice = person.avatarIcon ?? 'auto'
  const photo = person.avatarPhoto ?? person.photo
  const source = photo?.avatarUrl || photo?.url
  const Icon = choice in icons ? icons[choice as keyof typeof icons] : null
  return (
    <span className={`person-avatar ${className}`} aria-hidden="true">
      {choice === 'auto' && source && source !== failedSource ? (
        // Keep requests on the authenticated file route; do not proxy private photos through an image cache.
        <Image
          unoptimized
          src={source}
          width={160}
          height={160}
          alt=""
          onError={() => setFailedSource(source)}
        />
      ) : Icon ? (
        <Icon />
      ) : (
        initials(person.name)
      )}
    </span>
  )
}

export function PersonPortrait({ person }: { person: Person }) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const photo = person.photo
  if (!photo?.url || failedSource === photo.url) return null
  return (
    <Image
      unoptimized
      className="person-portrait"
      src={photo.url}
      alt={photo.alt || `Portret van ${person.name}`}
      width={photo.width || 800}
      height={photo.height || 800}
      onError={() => setFailedSource(photo.url)}
    />
  )
}
