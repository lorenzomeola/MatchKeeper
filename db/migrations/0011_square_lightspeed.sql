CREATE TABLE "keeper_debt_deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"amount_pence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keeper_debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goalkeeper_id" uuid NOT NULL,
	"dispute_id" uuid,
	"amount_pence" integer NOT NULL,
	"recovered_pence" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "stripe_charge_id" text;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "evidence" jsonb;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "evidence_generated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "prev_payment_status" text;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "fault_set_by" uuid;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "fault_set_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "reversal_id" text;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "reversed_pence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "reversal_error" text;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "retransfer_id" text;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "retransferred_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "funds_withdrawn_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "funds_reinstated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "keeper_debt_deductions" ADD CONSTRAINT "keeper_debt_deductions_debt_id_keeper_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."keeper_debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keeper_debt_deductions" ADD CONSTRAINT "keeper_debt_deductions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keeper_debts" ADD CONSTRAINT "keeper_debts_goalkeeper_id_profiles_id_fk" FOREIGN KEY ("goalkeeper_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keeper_debts" ADD CONSTRAINT "keeper_debts_dispute_id_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "public"."disputes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "keeper_debt_deductions_debt_booking_uq" ON "keeper_debt_deductions" USING btree ("debt_id","booking_id");--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_fault_set_by_profiles_id_fk" FOREIGN KEY ("fault_set_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;