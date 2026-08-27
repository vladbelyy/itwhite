import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_leads_delivery_status" AS ENUM('queued', 'processing', 'retrying', 'delivered', 'partial', 'dead_letter');
  CREATE TYPE "public"."enum_leads_bitrix_status" AS ENUM('not_configured', 'pending', 'delivered', 'failed');
  CREATE TYPE "public"."enum_leads_telegram_status" AS ENUM('not_configured', 'pending', 'delivered', 'failed');
  ALTER TYPE "public"."enum_leads_status" ADD VALUE 'spam';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'deliverLead' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'deliverLead' BEFORE 'schedulePublish';
  CREATE TABLE "leads_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "lead_files" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"original_name" varchar NOT NULL,
  	"submission_id" varchar NOT NULL,
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
  
  ALTER TABLE "leads" ALTER COLUMN "source" SET DEFAULT 'website';
  ALTER TABLE "leads" ADD COLUMN "submission_id" varchar;
  ALTER TABLE "leads" ADD COLUMN "request_code" varchar;
  ALTER TABLE "leads" ADD COLUMN "contact" varchar;
  ALTER TABLE "leads" ADD COLUMN "task" varchar;
  ALTER TABLE "leads" ADD COLUMN "systems" varchar;
  ALTER TABLE "leads" ADD COLUMN "site" varchar;
  ALTER TABLE "leads" ADD COLUMN "diagnosis" varchar;
  ALTER TABLE "leads" ADD COLUMN "origin_service" varchar;
  ALTER TABLE "leads" ADD COLUMN "origin_scenario" varchar;
  ALTER TABLE "leads" ADD COLUMN "landing_path" varchar;
  ALTER TABLE "leads" ADD COLUMN "referrer" varchar;
  ALTER TABLE "leads" ADD COLUMN "attachment_id" integer;
  ALTER TABLE "leads" ADD COLUMN "consent_version" varchar;
  ALTER TABLE "leads" ADD COLUMN "privacy_version" varchar;
  ALTER TABLE "leads" ADD COLUMN "session_id" varchar;
  ALTER TABLE "leads" ADD COLUMN "ip_hash" varchar;
  ALTER TABLE "leads" ADD COLUMN "user_agent" varchar;
  ALTER TABLE "leads" ADD COLUMN "delivery_status" "enum_leads_delivery_status" DEFAULT 'queued' NOT NULL;
  ALTER TABLE "leads" ADD COLUMN "bitrix_status" "enum_leads_bitrix_status" DEFAULT 'pending';
  ALTER TABLE "leads" ADD COLUMN "telegram_status" "enum_leads_telegram_status" DEFAULT 'pending';
  ALTER TABLE "leads" ADD COLUMN "bitrix_lead_id" varchar;
  ALTER TABLE "leads" ADD COLUMN "telegram_message_id" varchar;
  ALTER TABLE "leads" ADD COLUMN "telegram_attachment_delivered" boolean DEFAULT false;
  ALTER TABLE "leads" ADD COLUMN "delivery_attempts" numeric DEFAULT 0;
  ALTER TABLE "leads" ADD COLUMN "last_delivery_error" varchar;
  ALTER TABLE "leads" ADD COLUMN "delivered_at" timestamp(3) with time zone;
  UPDATE "leads" SET
    "submission_id" = 'legacy-' || "id"::text,
    "request_code" = 'LEGACY-' || "id"::text,
    "contact" = COALESCE(NULLIF("phone", ''), NULLIF("email", ''), 'legacy-record'),
    "task" = COALESCE(NULLIF("message", ''), 'Legacy lead imported before durable intake');
  ALTER TABLE "leads" ALTER COLUMN "submission_id" SET NOT NULL;
  ALTER TABLE "leads" ALTER COLUMN "request_code" SET NOT NULL;
  ALTER TABLE "leads" ALTER COLUMN "contact" SET NOT NULL;
  ALTER TABLE "leads" ALTER COLUMN "task" SET NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "lead_files_id" integer;
  ALTER TABLE "leads_texts" ADD CONSTRAINT "leads_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "leads_texts_order_parent" ON "leads_texts" USING btree ("order","parent_id");
  CREATE INDEX "lead_files_submission_id_idx" ON "lead_files" USING btree ("submission_id");
  CREATE INDEX "lead_files_updated_at_idx" ON "lead_files" USING btree ("updated_at");
  CREATE INDEX "lead_files_created_at_idx" ON "lead_files" USING btree ("created_at");
  CREATE UNIQUE INDEX "lead_files_filename_idx" ON "lead_files" USING btree ("filename");
  ALTER TABLE "leads" ADD CONSTRAINT "leads_attachment_id_lead_files_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."lead_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_lead_files_fk" FOREIGN KEY ("lead_files_id") REFERENCES "public"."lead_files"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "leads_submission_id_idx" ON "leads" USING btree ("submission_id");
  CREATE INDEX "leads_request_code_idx" ON "leads" USING btree ("request_code");
  CREATE INDEX "leads_attachment_idx" ON "leads" USING btree ("attachment_id");
  CREATE INDEX "payload_locked_documents_rels_lead_files_id_idx" ON "payload_locked_documents_rels" USING btree ("lead_files_id");`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  void db
  throw new Error('This migration stores durable lead and delivery data and is intentionally fix-forward only. Restore a pre-migration backup into an isolated database instead of migrating down.')
}
