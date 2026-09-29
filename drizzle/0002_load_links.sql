ALTER TABLE "payments" ADD COLUMN "inward_load_id" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "outward_load_id" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_inward_load_id_inward_loads_id_fk" FOREIGN KEY ("inward_load_id") REFERENCES "public"."inward_loads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_outward_load_id_outward_loads_id_fk" FOREIGN KEY ("outward_load_id") REFERENCES "public"."outward_loads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "outward_invoice_no_uq" ON "outward_loads" USING btree ("invoice_no");--> statement-breakpoint
CREATE INDEX "payments_inward_load_idx" ON "payments" USING btree ("inward_load_id");--> statement-breakpoint
CREATE INDEX "payments_outward_load_idx" ON "payments" USING btree ("outward_load_id");--> statement-breakpoint
-- Link payments saved before this change, which only carried the load number in their reference text.
UPDATE "payments" p SET "inward_load_id" = l."id" FROM "inward_loads" l
  WHERE p."reference" = 'Inward #' || l."id" AND p."party_id" = l."party_id" AND p."inward_load_id" IS NULL;--> statement-breakpoint
UPDATE "payments" p SET "outward_load_id" = l."id" FROM "outward_loads" l
  WHERE p."reference" = 'Outward #' || l."id" AND p."party_id" = l."party_id" AND p."outward_load_id" IS NULL;
