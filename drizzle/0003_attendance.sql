CREATE TYPE "public"."attendance_status" AS ENUM('present', 'half', 'absent');--> statement-breakpoint
CREATE TYPE "public"."pay_basis" AS ENUM('monthly', 'daily');--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"worker_id" integer NOT NULL,
	"date" date NOT NULL,
	"status" "attendance_status" NOT NULL,
	"marked_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "pay_basis" "pay_basis" DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "daily_wage" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_worker_date_uq" ON "attendance" USING btree ("worker_id","date");--> statement-breakpoint
CREATE INDEX "attendance_date_idx" ON "attendance" USING btree ("date");