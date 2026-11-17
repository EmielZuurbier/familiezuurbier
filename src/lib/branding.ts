export const familyBrand = {
  name: 'Familie Zuurbier',
  surname: 'Zuurbier',
  description: 'Een besloten plek om de stamboom van de familie Zuurbier te ontdekken.',
} as const
export const familyPageTitle = (page: string) => `${page} · ${familyBrand.name}`
