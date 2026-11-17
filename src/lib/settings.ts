export function databaseConfigured(): boolean {
  return !!process.env.DATABASE_URL && (process.env.PAYLOAD_SECRET?.length ?? 0) >= 32
}
