import 'server-only'

export function mapboxToken(): string {
  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim() ?? ''
  // GL JS needs a public token. Never pass a secret token into a client component.
  return token.startsWith('pk.') ? token : ''
}
