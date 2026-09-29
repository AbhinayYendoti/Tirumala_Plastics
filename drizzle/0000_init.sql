CREATE TYPE "public"."expense_category" AS ENUM('diesel', 'electricity', 'maintenance', 'transport', 'food', 'other');--> statement-breakpoint
CREATE TYPE "public"."party_type" AS ENUM('supplier', 'buyer', 'both');--> statement-breakpoint
CREATE TYPE "public"."pay_direction" AS ENUM('paid', 'received');--> statement-breakpoint
CREATE TYPE "public"."pay_mode" AS ENUM('cash', 'upi', 'bank', 'cheque');--> statement-breakpoint
CREATE TYPE "public"."salary_txn_type" AS ENUM('advance', 'salary', 'bonus');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"category" "expense_category" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"quantity" numeric(12, 2),
	"meter_reading" text,
	"mode" "pay_mode" DEFAULT 'cash' NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inward_loads" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"party_id" integer NOT NULL,
	"material_id" integer NOT NULL,
	"vehicle_no" text,
	"gross_kg" numeric(12, 2) NOT NULL,
	"tare_kg" numeric(12, 2) NOT NULL,
	"net_kg" numeric(12, 2) NOT NULL,
	"deduction_kg" numeric(12, 2) DEFAULT 0 NOT NULL,
	"billable_kg" numeric(12, 2) NOT NULL,
	"rate" numeric(14, 2) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bill_no" text
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hsn" text,
	"default_rate" numeric(14, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outward_loads" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"party_id" integer NOT NULL,
	"material_id" integer NOT NULL,
	"vehicle_no" text,
	"gross_kg" numeric(12, 2) NOT NULL,
	"tare_kg" numeric(12, 2) NOT NULL,
	"net_kg" numeric(12, 2) NOT NULL,
	"deduction_kg" numeric(12, 2) DEFAULT 0 NOT NULL,
	"billable_kg" numeric(12, 2) NOT NULL,
	"rate" numeric(14, 2) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invoice_no" text,
	"eway_bill_no" text,
	"gst_rate" numeric(5, 2) DEFAULT 18 NOT NULL,
	"cgst" numeric(14, 2) DEFAULT 0 NOT NULL,
	"sgst" numeric(14, 2) DEFAULT 0 NOT NULL,
	"igst" numeric(14, 2) DEFAULT 0 NOT NULL,
	"total" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "party_type" DEFAULT 'both' NOT NULL,
	"phone" text,
	"gstin" text,
	"address" text,
	"state_code" text DEFAULT '37' NOT NULL,
	"opening_balance" numeric(14, 2) DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"party_id" integer NOT NULL,
	"direction" "pay_direction" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"mode" "pay_mode" DEFAULT 'cash' NOT NULL,
	"reference" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_txns" (
	"id" serial PRIMARY KEY NOT NULL,
	"worker_id" integer NOT NULL,
	"date" date NOT NULL,
	"month" text NOT NULL,
	"type" "salary_txn_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"mode" "pay_mode" DEFAULT 'cash' NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"role" text,
	"monthly_salary" numeric(14, 2) NOT NULL,
	"join_date" date,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inward_loads" ADD CONSTRAINT "inward_loads_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inward_loads" ADD CONSTRAINT "inward_loads_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outward_loads" ADD CONSTRAINT "outward_loads_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outward_loads" ADD CONSTRAINT "outward_loads_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_txns" ADD CONSTRAINT "salary_txns_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX "inward_date_idx" ON "inward_loads" USING btree ("date");--> statement-breakpoint
CREATE INDEX "inward_party_idx" ON "inward_loads" USING btree ("party_id");--> statement-breakpoint
CREATE INDEX "outward_date_idx" ON "outward_loads" USING btree ("date");--> statement-breakpoint
CREATE INDEX "outward_party_idx" ON "outward_loads" USING btree ("party_id");--> statement-breakpoint
CREATE INDEX "payments_date_idx" ON "payments" USING btree ("date");--> statement-breakpoint
CREATE INDEX "payments_party_idx" ON "payments" USING btree ("party_id");--> statement-breakpoint
CREATE INDEX "salary_worker_month_idx" ON "salary_txns" USING btree ("worker_id","month");