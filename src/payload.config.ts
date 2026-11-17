import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { nl } from '@payloadcms/translations/languages/nl'
import { Administrators, People, Parentages, Partnerships } from './collections/collections'
import { FamilyMembers, FamilySessions, FamilyRateLimits } from './collections/family-accounts'
import { familyEmail } from './lib/family-auth/mail'
import sharp from 'sharp'
import { Media } from './collections/media'
import { familyBrand } from './lib/branding'
const dirname = path.dirname(fileURLToPath(import.meta.url))
export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || 'demo-build-only-no-real-data-no-api',
  admin: {
    user: 'administrators',
    theme: 'light',
    importMap: { baseDir: dirname },
    meta: { titleSuffix: ` | ${familyBrand.name}` },
    components: { beforeDashboard: ['./components/AdminWelcome#AdminWelcome'] },
  },
  i18n: { fallbackLanguage: 'nl', supportedLanguages: { nl } },
  collections: [
    Administrators,
    People,
    Media,
    Partnerships,
    Parentages,
    FamilyMembers,
    FamilySessions,
    FamilyRateLimits,
  ],
  db: postgresAdapter({
    pool: {
      connectionString:
        process.env.DATABASE_URL || 'postgresql://unused:unused@127.0.0.1:54329/unused',
    },
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  graphQL: { disable: true },
  sharp,
  upload: { limits: { fileSize: 10 * 1024 * 1024 }, abortOnLimit: true },
  email: familyEmail,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
