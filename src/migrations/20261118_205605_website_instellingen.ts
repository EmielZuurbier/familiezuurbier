import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_appearance_heading_font" AS ENUM('lora', 'dm-sans', 'system');
  CREATE TYPE "public"."enum_site_settings_appearance_body_font" AS ENUM('lora', 'dm-sans', 'system');
  CREATE TYPE "public"."enum_site_settings_options_default_tree_style" AS ENUM('structured', 'organic');
  CREATE TYPE "public"."enum_site_settings_options_mouse_speed" AS ENUM('slow', 'normal', 'fast');
  CREATE TABLE "brand_assets" (
    "id" serial PRIMARY KEY NOT NULL,
    "alt" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "url" varchar,
    "thumbnail_u_r_l" varchar,
    "filename" varchar,
    "mime_type" varchar,
    "filesize" numeric,
    "width" numeric,
    "height" numeric,
    "focal_x" numeric,
    "focal_y" numeric
  );

  CREATE TABLE "site_settings" (
    "id" serial PRIMARY KEY NOT NULL,
    "identity_name" varchar DEFAULT 'Familie Zuurbier' NOT NULL,
    "identity_surname" varchar DEFAULT 'Zuurbier' NOT NULL,
    "identity_wordmark" varchar DEFAULT 'familieboom',
    "identity_show_dot" boolean DEFAULT true,
    "identity_description" varchar DEFAULT 'Een besloten plek om de stamboom van de familie {familienaam} te ontdekken.',
    "identity_logo_id" integer,
    "identity_logo_alt" varchar DEFAULT '{websitenaam}',
    "identity_icon_id" integer,
    "appearance_ink" varchar DEFAULT '#233e33' NOT NULL,
    "appearance_green" varchar DEFAULT '#345d49' NOT NULL,
    "appearance_paper" varchar DEFAULT '#f8f9f4' NOT NULL,
    "appearance_surface" varchar DEFAULT '#fffefa' NOT NULL,
    "appearance_accent" varchar DEFAULT '#b49c71' NOT NULL,
    "appearance_muted" varchar DEFAULT '#6f7c70' NOT NULL,
    "appearance_line" varchar DEFAULT '#e2e7dd' NOT NULL,
    "appearance_heading_font" "enum_site_settings_appearance_heading_font" DEFAULT 'lora' NOT NULL,
    "appearance_body_font" "enum_site_settings_appearance_body_font" DEFAULT 'dm-sans' NOT NULL,
    "pages_tree_enabled" boolean DEFAULT true,
    "pages_tree_label" varchar DEFAULT 'Stamboom',
    "pages_tree_short_label" varchar DEFAULT 'Stamboom',
    "pages_tree_workspace_title" varchar DEFAULT 'De stamboom',
    "pages_tree_page_title" varchar DEFAULT 'Onze stamboom',
    "pages_tree_eyebrow" varchar DEFAULT 'VAN GENERATIE OP GENERATIE',
    "pages_tree_title" varchar DEFAULT 'Familie',
    "pages_tree_title_accent" varchar DEFAULT '{familienaam}.',
    "pages_tree_description" varchar DEFAULT 'Ontdek de mensen en de verbindingen die ons verhaal vormen.',
    "pages_tree_example_title" varchar DEFAULT 'Onze familie,',
    "pages_tree_example_title_accent" varchar DEFAULT 'verbonden.',
    "pages_map_enabled" boolean DEFAULT true,
    "pages_map_label" varchar DEFAULT 'Kaart',
    "pages_map_short_label" varchar DEFAULT 'Kaart',
    "pages_map_workspace_title" varchar DEFAULT 'Op de kaart',
    "pages_map_page_title" varchar DEFAULT 'Familie op de kaart',
    "pages_map_eyebrow" varchar DEFAULT 'VERBONDEN, WAAR WE OOK ZIJN',
    "pages_map_title" varchar DEFAULT 'Familie',
    "pages_map_title_accent" varchar DEFAULT '{familienaam}.',
    "pages_map_description" varchar DEFAULT 'Ontdek waar de familie woont en waar onze verhalen begonnen.',
    "pages_map_example_title" varchar DEFAULT 'Onze familie,',
    "pages_map_example_title_accent" varchar DEFAULT 'op de kaart.',
    "pages_calendar_enabled" boolean DEFAULT true,
    "pages_calendar_label" varchar DEFAULT 'Verjaardagskalender',
    "pages_calendar_short_label" varchar DEFAULT 'Verjaardagen',
    "pages_calendar_workspace_title" varchar DEFAULT 'Verjaardagen',
    "pages_calendar_page_title" varchar DEFAULT 'Verjaardagskalender',
    "pages_calendar_eyebrow" varchar DEFAULT 'ELKE VERJAARDAG EEN VERHAAL',
    "pages_calendar_title" varchar DEFAULT 'Familie',
    "pages_calendar_title_accent" varchar DEFAULT '{familienaam}.',
    "pages_calendar_description" varchar DEFAULT 'Alle geboortedagen bij elkaar. Kijk wie er jarig is en hoe oud iemand wordt.',
    "pages_calendar_example_title" varchar DEFAULT 'Een jaar vol',
    "pages_calendar_example_title_accent" varchar DEFAULT 'familie.',
    "pages_events_enabled" boolean DEFAULT true,
    "pages_events_label" varchar DEFAULT 'Gebeurtenissen',
    "pages_events_short_label" varchar DEFAULT 'Verhalen',
    "pages_events_workspace_title" varchar DEFAULT 'Gebeurtenissen',
    "pages_events_page_title" varchar DEFAULT 'Gebeurtenissen',
    "pages_events_eyebrow" varchar DEFAULT 'VERHALEN DIE ONS VERBINDEN',
    "pages_events_title" varchar DEFAULT 'Familie',
    "pages_events_title_accent" varchar DEFAULT '{familienaam}.',
    "pages_events_description" varchar DEFAULT 'Grote momenten en kleine verhalen. Bewaard voor de volgende generatie.',
    "pages_events_example_title" varchar DEFAULT 'Onze gedeelde',
    "pages_events_example_title_accent" varchar DEFAULT 'herinneringen.',
    "shared_workspace_eyebrow" varchar DEFAULT 'FAMILIEOVERZICHT',
    "shared_statistics_title" varchar DEFAULT 'DE STAMBOOM IN CIJFERS',
    "shared_person_title" varchar DEFAULT 'PERSOONSGEGEVENS',
    "shared_event_eyebrow" varchar DEFAULT 'EEN VERHAAL UIT ONZE FAMILIE',
    "shared_sidebar_note" varchar DEFAULT E'Elke naam is een deel\nvan een groter verhaal.',
    "shared_privacy_note" varchar DEFAULT 'Zorgvuldig bewaard, in eigen beheer',
    "shared_manage_label" varchar DEFAULT 'Stamboom beheren',
    "login_page_title" varchar DEFAULT 'Inloggen',
    "login_eyebrow" varchar DEFAULT 'EEN PLEK VOOR DE FAMILIE',
    "login_title" varchar DEFAULT 'Welkom bij de familie {familienaam}.',
    "login_description" varchar DEFAULT 'Log in met het e-mailadres waarop je bent uitgenodigd. Je ontvangt een eenmalige code; een wachtwoord is niet nodig.',
    "login_invite_title" varchar DEFAULT 'Je bent uitgenodigd.',
    "login_invite_description" varchar DEFAULT 'Accepteer je persoonlijke uitnodiging om de stamboom en familiekaart te bekijken. Je krijgt alleen kijkrechten.',
    "login_code_title" varchar DEFAULT 'Bekijk je e-mail.',
    "login_code_description" varchar DEFAULT 'Als {email} toegang heeft, ontvang je daar een zescijferige code. De code is tien minuten geldig.',
    "login_privacy" varchar DEFAULT 'Alleen uitgenodigde familieleden hebben toegang.',
    "login_private_title" varchar DEFAULT 'De familie {familienaam} blijft privé',
    "login_private_description" varchar DEFAULT 'Deze gegevens zijn alleen voor uitgenodigde familieleden. Log in met je e-mailadres om de stamboom en kaart te bekijken.',
    "login_button" varchar DEFAULT 'Stuur mij een inlogcode',
    "mail_invitation_subject" varchar DEFAULT 'Je bent uitgenodigd voor de stamboom van de familie {familienaam}',
    "mail_invitation_introduction" varchar DEFAULT 'Je bent uitgenodigd om de besloten stamboom en familiekaart van de familie {familienaam} te bekijken.',
    "mail_code_subject" varchar DEFAULT 'Je inlogcode voor de familie {familienaam}',
    "options_default_tree_style" "enum_site_settings_options_default_tree_style" DEFAULT 'structured' NOT NULL,
    "options_mouse_exploration" boolean DEFAULT true,
    "options_mouse_speed" "enum_site_settings_options_mouse_speed" DEFAULT 'normal' NOT NULL,
    "options_minimap" boolean DEFAULT true,
    "options_statistics" boolean DEFAULT true,
    "options_calendar_export" boolean DEFAULT true,
    "options_map_residence" boolean DEFAULT true,
    "options_map_birth" boolean DEFAULT true,
    "tracking_enabled" boolean DEFAULT true,
    "tracking_container_id" varchar DEFAULT 'GTM-T37ZTN97',
    "admin_title" varchar DEFAULT 'Welkom bij de familie {familienaam}',
    "admin_introduction" varchar DEFAULT 'Beheer hier de mensen, familiebanden en verhalen die jullie verbinden.',
    "admin_login_title" varchar DEFAULT 'Een plek voor jullie familieverhaal.',
    "admin_login_description" varchar DEFAULT 'Log in om personen, familiebanden, verhalen en de website-instellingen te beheren.',
    "admin_access_page_title" varchar DEFAULT 'Familietoegang beheren',
    "admin_access_title" varchar DEFAULT 'Familietoegang',
    "admin_access_eyebrow" varchar DEFAULT 'PRIVÉ, VOOR DE FAMILIE',
    "admin_access_description" varchar DEFAULT 'Nodig familieleden persoonlijk uit. Zij kunnen de stamboom en kaart bekijken; alleen beheerders mogen gegevens wijzigen.',
    "updated_at" timestamp(3) with time zone,
    "created_at" timestamp(3) with time zone
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "brand_assets_id" integer;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_identity_logo_id_brand_assets_id_fk" FOREIGN KEY ("identity_logo_id") REFERENCES "public"."brand_assets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_identity_icon_id_brand_assets_id_fk" FOREIGN KEY ("identity_icon_id") REFERENCES "public"."brand_assets"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "brand_assets_updated_at_idx" ON "brand_assets" USING btree ("updated_at");
  CREATE INDEX "brand_assets_created_at_idx" ON "brand_assets" USING btree ("created_at");
  CREATE UNIQUE INDEX "brand_assets_filename_idx" ON "brand_assets" USING btree ("filename");
  CREATE INDEX "site_settings_identity_identity_logo_idx" ON "site_settings" USING btree ("identity_logo_id");
  CREATE INDEX "site_settings_identity_identity_icon_idx" ON "site_settings" USING btree ("identity_icon_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_brand_assets_fk" FOREIGN KEY ("brand_assets_id") REFERENCES "public"."brand_assets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_brand_assets_id_idx" ON "payload_locked_documents_rels" USING btree ("brand_assets_id");
  INSERT INTO "site_settings" ("created_at", "updated_at") VALUES (now(), now());`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_brand_assets_fk";
  DROP INDEX "payload_locked_documents_rels_brand_assets_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "brand_assets_id";
  DROP TABLE "site_settings";
  DROP TABLE "brand_assets";
  DROP TYPE "public"."enum_site_settings_appearance_heading_font";
  DROP TYPE "public"."enum_site_settings_appearance_body_font";
  DROP TYPE "public"."enum_site_settings_options_default_tree_style";
  DROP TYPE "public"."enum_site_settings_options_mouse_speed";`)
}
