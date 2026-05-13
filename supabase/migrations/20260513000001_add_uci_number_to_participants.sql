ALTER TABLE "public"."participants"
  ADD COLUMN IF NOT EXISTS "uci_number" text;
