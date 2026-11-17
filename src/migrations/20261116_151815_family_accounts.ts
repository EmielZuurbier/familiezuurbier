import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_family_members_status" AS ENUM('invited', 'active', 'revoked');
  CREATE TABLE "family_members" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"status" "enum_family_members_status" DEFAULT 'invited' NOT NULL,
  	"auth_version" numeric DEFAULT 1 NOT NULL,
  	"invited_at" timestamp(3) with time zone,
  	"activated_at" timestamp(3) with time zone,
  	"last_login_at" timestamp(3) with time zone,
  	"invite_hash" varchar,
  	"invite_expires_at" timestamp(3) with time zone,
  	"code_hash" varchar,
  	"code_expires_at" timestamp(3) with time zone,
  	"code_attempts" numeric,
  	"code_sent_at" timestamp(3) with time zone,
  	"mail_failed" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "family_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"member_id" integer NOT NULL,
  	"token_hash" varchar NOT NULL,
  	"auth_version" numeric NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "family_rate_limits" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"count" numeric NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "family_members_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "family_sessions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "family_rate_limits_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN "family_members_id" integer;
  ALTER TABLE "family_sessions" ADD CONSTRAINT "family_sessions_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "family_members_email_idx" ON "family_members" USING btree ("email");
  CREATE INDEX "family_members_updated_at_idx" ON "family_members" USING btree ("updated_at");
  CREATE INDEX "family_members_created_at_idx" ON "family_members" USING btree ("created_at");
  CREATE INDEX "family_sessions_member_idx" ON "family_sessions" USING btree ("member_id");
  CREATE UNIQUE INDEX "family_sessions_token_hash_idx" ON "family_sessions" USING btree ("token_hash");
  CREATE INDEX "family_sessions_expires_at_idx" ON "family_sessions" USING btree ("expires_at");
  CREATE INDEX "family_sessions_updated_at_idx" ON "family_sessions" USING btree ("updated_at");
  CREATE INDEX "family_sessions_created_at_idx" ON "family_sessions" USING btree ("created_at");
  CREATE UNIQUE INDEX "family_rate_limits_key_idx" ON "family_rate_limits" USING btree ("key");
  CREATE INDEX "family_rate_limits_expires_at_idx" ON "family_rate_limits" USING btree ("expires_at");
  CREATE INDEX "family_rate_limits_updated_at_idx" ON "family_rate_limits" USING btree ("updated_at");
  CREATE INDEX "family_rate_limits_created_at_idx" ON "family_rate_limits" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_family_members_fk" FOREIGN KEY ("family_members_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_family_sessions_fk" FOREIGN KEY ("family_sessions_id") REFERENCES "public"."family_sessions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_family_rate_limits_fk" FOREIGN KEY ("family_rate_limits_id") REFERENCES "public"."family_rate_limits"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_family_members_fk" FOREIGN KEY ("family_members_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_family_members_id_idx" ON "payload_locked_documents_rels" USING btree ("family_members_id");
  CREATE INDEX "payload_locked_documents_rels_family_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("family_sessions_id");
  CREATE INDEX "payload_locked_documents_rels_family_rate_limits_id_idx" ON "payload_locked_documents_rels" USING btree ("family_rate_limits_id");
  CREATE INDEX "payload_preferences_rels_family_members_id_idx" ON "payload_preferences_rels" USING btree ("family_members_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_family_members_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_family_sessions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_family_rate_limits_fk";
  
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_family_members_fk";
  
  DROP INDEX "payload_locked_documents_rels_family_members_id_idx";
  DROP INDEX "payload_locked_documents_rels_family_sessions_id_idx";
  DROP INDEX "payload_locked_documents_rels_family_rate_limits_id_idx";
  DROP INDEX "payload_preferences_rels_family_members_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "family_members_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "family_sessions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "family_rate_limits_id";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN "family_members_id";
  DROP TABLE "family_sessions";
  DROP TABLE "family_rate_limits";
  DROP TABLE "family_members";
  DROP TYPE "public"."enum_family_members_status";`)
}
