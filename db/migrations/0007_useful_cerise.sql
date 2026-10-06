CREATE TYPE "public"."booking_status" AS ENUM('pending_payment', 'confirmed', 'under_review', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."cancelled_by" AS ENUM('team', 'keeper', 'system', 'admin');--> statement-breakpoint
CREATE TYPE "public"."team_response" AS ENUM('confirmed', 'reported_no_show', 'reported_other');--> statement-breakpoint
ALTER TYPE "public"."payment_status" ADD VALUE 'pending';--> statement-breakpoint
ALTER TYPE "public"."payment_status" ADD VALUE 'partially_refunded';--> statement-breakpoint
ALTER TYPE "public"."payment_status" ADD VALUE 'disputed';--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"type" text NOT NULL,
	"actor_id" uuid,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_dispute_id" text NOT NULL,
	"booking_id" uuid,
	"reason" text,
	"status" text NOT NULL,
	"amount_pence" integer NOT NULL,
	"due_by" timestamp with time zone,
	"evidence_submitted_at" timestamp with time zone,
	"outcome" text,
	"fault" text,
	"recovered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disputes_stripe_dispute_id_unique" UNIQUE("stripe_dispute_id")
);
--> statement-breakpoint
CREATE TABLE "keeper_stripe_accounts" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"stripe_account_id" text NOT NULL,
	"payouts_enabled" boolean DEFAULT false NOT NULL,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "keeper_stripe_accounts_stripe_account_id_unique" UNIQUE("stripe_account_id")
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "status" "booking_status" DEFAULT 'confirmed' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancelled_by" "cancelled_by";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancellation_charge_pct" smallint;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "rate_pence" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "platform_fee_pence" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "total_pence" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "keeper_payout_pence" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "keeper_checked_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "check_in_lat" double precision;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "check_in_lng" double precision;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "check_in_distance_m" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "team_response" "team_response";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "team_responded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "team_report_note" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "auto_release_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "released_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "stripe_charge_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "stripe_transfer_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "stripe_refund_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "terms_version" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "strikes" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keeper_stripe_accounts" ADD CONSTRAINT "keeper_stripe_accounts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;