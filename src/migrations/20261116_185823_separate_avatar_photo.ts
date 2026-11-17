import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "people" ADD COLUMN "avatar_photo_id" integer;
  ALTER TABLE "people" ADD CONSTRAINT "people_avatar_photo_id_media_id_fk" FOREIGN KEY ("avatar_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "people_avatar_photo_idx" ON "people" USING btree ("avatar_photo_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "people" DROP CONSTRAINT "people_avatar_photo_id_media_id_fk";
  
  DROP INDEX "people_avatar_photo_idx";
  ALTER TABLE "people" DROP COLUMN "avatar_photo_id";`)
}
