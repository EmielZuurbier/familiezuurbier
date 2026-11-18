import type { AvatarIcon } from './avatars'
export type PersonPhoto = {
  url: string
  avatarUrl?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
}
export type PartialDate = { year?: number | null; month?: number | null; day?: number | null }
export type Person = {
  id: string
  name: string
  photo?: PersonPhoto | null
  avatarPhoto?: PersonPhoto | null
  avatarIcon?: AvatarIcon | null
  birthSurname?: string | null
  currentResidence?: string | null
  isExample?: boolean
  birth: PartialDate
  birthPlace?: string | null
  lifeStatus: 'living' | 'deceased' | 'unknown'
  death: PartialDate
}
export type Parentage = { id: string; parent: string; child: string }
export type Partnership = {
  id: string
  personA: string
  personB: string
  status: 'current' | 'ended' | 'unknown'
  children?: string[]
}
export type Family = { people: Person[]; parentages: Parentage[]; partnerships: Partnership[] }
