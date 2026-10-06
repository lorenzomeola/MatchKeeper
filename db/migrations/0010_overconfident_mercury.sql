ALTER TABLE "strikes" ADD COLUMN "waived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "strikes" ADD COLUMN "waived_by" uuid;--> statement-breakpoint
ALTER TABLE "strikes" ADD COLUMN "waived_reason" text;--> statement-breakpoint
ALTER TABLE "strikes" ADD CONSTRAINT "strikes_waived_by_profiles_id_fk" FOREIGN KEY ("waived_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;