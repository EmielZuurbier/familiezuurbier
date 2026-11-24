import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "prefix" varchar DEFAULT '';
  ALTER TABLE "media" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "brand_assets" ADD COLUMN "prefix" varchar DEFAULT '';
  ALTER TABLE "brand_assets" ADD COLUMN "_objectkey" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" DROP COLUMN "prefix";
  ALTER TABLE "media" DROP COLUMN "_objectkey";
  ALTER TABLE "brand_assets" DROP COLUMN "prefix";
  ALTER TABLE "brand_assets" DROP COLUMN "_objectkey";`)
}
