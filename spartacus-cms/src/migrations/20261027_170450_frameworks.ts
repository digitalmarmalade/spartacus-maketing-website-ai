import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_frameworks_status" AS ENUM('draft', 'published');
  CREATE TABLE "frameworks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"path" varchar NOT NULL,
  	"order" numeric NOT NULL,
  	"status" "enum_frameworks_status" DEFAULT 'draft' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "frameworks_id" integer;
  CREATE UNIQUE INDEX "frameworks_path_idx" ON "frameworks" USING btree ("path");
  CREATE INDEX "frameworks_updated_at_idx" ON "frameworks" USING btree ("updated_at");
  CREATE INDEX "frameworks_created_at_idx" ON "frameworks" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_frameworks_fk" FOREIGN KEY ("frameworks_id") REFERENCES "public"."frameworks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_frameworks_id_idx" ON "payload_locked_documents_rels" USING btree ("frameworks_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_frameworks_fk";
  
  DROP INDEX "payload_locked_documents_rels_frameworks_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "frameworks_id";
  DROP TABLE "frameworks";
  DROP TYPE "public"."enum_frameworks_status";`)
}
