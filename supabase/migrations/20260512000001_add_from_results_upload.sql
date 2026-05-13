ALTER TABLE "public"."race_entries"
  ADD COLUMN IF NOT EXISTS "from_results_upload" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "idx_race_entries_from_results_upload"
  ON "public"."race_entries" USING btree ("from_results_upload");
