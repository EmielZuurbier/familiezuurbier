import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "partnerships" ADD COLUMN "title" varchar;
  CREATE INDEX "partnerships_title_idx" ON "partnerships" USING btree ("title");
  UPDATE "partnerships" AS pair
    SET "title" = first_person."name" || ' & ' || second_person."name"
    FROM "people" AS first_person, "people" AS second_person
    WHERE pair."person_a_id" = first_person."id"
      AND pair."person_b_id" = second_person."id";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "partnerships_title_idx";
  ALTER TABLE "partnerships" DROP COLUMN "title";`)
}
