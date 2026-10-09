DROP INDEX "bookings_active_match_uq";--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "keepers_needed" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_active_match_keeper_uq" ON "bookings" USING btree ("match_id","goalkeeper_id") WHERE "bookings"."status" <> 'cancelled';--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_keepers_needed_chk" CHECK ("matches"."keepers_needed" in (1, 2));