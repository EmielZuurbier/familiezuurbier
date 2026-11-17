import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "partnerships_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer
  );
  
  ALTER TABLE "partnerships_rels" ADD CONSTRAINT "partnerships_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."partnerships"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "partnerships_rels" ADD CONSTRAINT "partnerships_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "partnerships_rels_order_idx" ON "partnerships_rels" USING btree ("order");
  CREATE INDEX "partnerships_rels_parent_idx" ON "partnerships_rels" USING btree ("parent_id");
  CREATE INDEX "partnerships_rels_path_idx" ON "partnerships_rels" USING btree ("path");
  CREATE INDEX "partnerships_rels_people_id_idx" ON "partnerships_rels" USING btree ("people_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "partnerships_rels" CASCADE;`)
}
