ALTER TABLE "keeper_stripe_accounts" ADD COLUMN "payout_failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "keeper_stripe_accounts" ADD COLUMN "payout_failure" text;