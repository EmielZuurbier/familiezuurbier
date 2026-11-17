import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_people_life_status" AS ENUM('unknown', 'living', 'deceased');
  CREATE TYPE "public"."enum_partnerships_status" AS ENUM('unknown', 'current', 'ended');
  CREATE TABLE "administrators_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "administrators" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "people" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"is_example" boolean DEFAULT false,
  	"name" varchar NOT NULL,
  	"birth_day" numeric,
  	"birth_month" numeric,
  	"birth_year" numeric,
  	"birth_place" varchar,
  	"life_status" "enum_people_life_status" DEFAULT 'unknown' NOT NULL,
  	"death_day" numeric,
  	"death_month" numeric,
  	"death_year" numeric,
  	"death_place" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "parentages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer NOT NULL,
  	"child_id" integer NOT NULL,
  	"pair_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "partnerships" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"person_a_id" integer NOT NULL,
  	"person_b_id" integer NOT NULL,
  	"status" "enum_partnerships_status" DEFAULT 'unknown' NOT NULL,
  	"pair_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"administrators_id" integer,
  	"people_id" integer,
  	"parentages_id" integer,
  	"partnerships_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"administrators_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "administrators_sessions" ADD CONSTRAINT "administrators_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."administrators"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "parentages" ADD CONSTRAINT "parentages_parent_id_people_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "parentages" ADD CONSTRAINT "parentages_child_id_people_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_person_a_id_people_id_fk" FOREIGN KEY ("person_a_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_person_b_id_people_id_fk" FOREIGN KEY ("person_b_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_administrators_fk" FOREIGN KEY ("administrators_id") REFERENCES "public"."administrators"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parentages_fk" FOREIGN KEY ("parentages_id") REFERENCES "public"."parentages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_partnerships_fk" FOREIGN KEY ("partnerships_id") REFERENCES "public"."partnerships"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_administrators_fk" FOREIGN KEY ("administrators_id") REFERENCES "public"."administrators"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "administrators_sessions_order_idx" ON "administrators_sessions" USING btree ("_order");
  CREATE INDEX "administrators_sessions_parent_id_idx" ON "administrators_sessions" USING btree ("_parent_id");
  CREATE INDEX "administrators_updated_at_idx" ON "administrators" USING btree ("updated_at");
  CREATE INDEX "administrators_created_at_idx" ON "administrators" USING btree ("created_at");
  CREATE UNIQUE INDEX "administrators_email_idx" ON "administrators" USING btree ("email");
  CREATE INDEX "people_name_idx" ON "people" USING btree ("name");
  CREATE INDEX "people_updated_at_idx" ON "people" USING btree ("updated_at");
  CREATE INDEX "people_created_at_idx" ON "people" USING btree ("created_at");
  CREATE INDEX "parentages_parent_idx" ON "parentages" USING btree ("parent_id");
  CREATE INDEX "parentages_child_idx" ON "parentages" USING btree ("child_id");
  CREATE UNIQUE INDEX "parentages_pair_key_idx" ON "parentages" USING btree ("pair_key");
  CREATE INDEX "parentages_updated_at_idx" ON "parentages" USING btree ("updated_at");
  CREATE INDEX "parentages_created_at_idx" ON "parentages" USING btree ("created_at");
  CREATE INDEX "partnerships_person_a_idx" ON "partnerships" USING btree ("person_a_id");
  CREATE INDEX "partnerships_person_b_idx" ON "partnerships" USING btree ("person_b_id");
  CREATE UNIQUE INDEX "partnerships_pair_key_idx" ON "partnerships" USING btree ("pair_key");
  CREATE INDEX "partnerships_updated_at_idx" ON "partnerships" USING btree ("updated_at");
  CREATE INDEX "partnerships_created_at_idx" ON "partnerships" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_administrators_id_idx" ON "payload_locked_documents_rels" USING btree ("administrators_id");
  CREATE INDEX "payload_locked_documents_rels_people_id_idx" ON "payload_locked_documents_rels" USING btree ("people_id");
  CREATE INDEX "payload_locked_documents_rels_parentages_id_idx" ON "payload_locked_documents_rels" USING btree ("parentages_id");
  CREATE INDEX "payload_locked_documents_rels_partnerships_id_idx" ON "payload_locked_documents_rels" USING btree ("partnerships_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_administrators_id_idx" ON "payload_preferences_rels" USING btree ("administrators_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "administrators_sessions" CASCADE;
  DROP TABLE "administrators" CASCADE;
  DROP TABLE "people" CASCADE;
  DROP TABLE "parentages" CASCADE;
  DROP TABLE "partnerships" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_people_life_status";
  DROP TYPE "public"."enum_partnerships_status";`)
}
