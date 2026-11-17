export const avatarOptions = [
  { label: 'Foto (avatarfoto, anders portretfoto)', value: 'auto' },
  { label: 'Initialen', value: 'initials' },
  { label: 'Persoon', value: 'person' },
  { label: 'Boom', value: 'tree' },
  { label: 'Bloem', value: 'flower' },
  { label: 'Zon', value: 'sun' },
  { label: 'Ster', value: 'star' },
  { label: 'Hart', value: 'heart' },
] as const
export type AvatarIcon = (typeof avatarOptions)[number]['value']
