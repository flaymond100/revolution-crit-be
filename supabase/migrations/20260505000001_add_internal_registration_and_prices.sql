-- Add internal_registration flag to race_calendar
ALTER TABLE "public"."race_calendar"
  ADD COLUMN IF NOT EXISTS "internal_registration" boolean NOT NULL DEFAULT false;

-- Create price tiers table for sub-races
CREATE TABLE IF NOT EXISTS "public"."race_sub_race_prices" (
  "id"           uuid DEFAULT "gen_random_uuid"() NOT NULL,
  "sub_race_id"  uuid NOT NULL,
  "label"        text NOT NULL DEFAULT 'Standard',
  "amount_cents" integer NOT NULL,
  "valid_from"   timestamp with time zone NOT NULL DEFAULT now(),
  "valid_until"  timestamp with time zone,
  "created_at"   timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "race_sub_race_prices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "race_sub_race_prices_sub_race_id_fkey"
    FOREIGN KEY ("sub_race_id") REFERENCES "public"."race_sub_races"("id") ON DELETE CASCADE,
  CONSTRAINT "race_sub_race_prices_amount_positive" CHECK ("amount_cents" > 0)
);

CREATE INDEX IF NOT EXISTS "idx_race_sub_race_prices_sub_race_id"
  ON "public"."race_sub_race_prices" USING btree ("sub_race_id");

-- RLS
ALTER TABLE "public"."race_sub_race_prices" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "race_sub_race_prices_public_select"
  ON "public"."race_sub_race_prices" FOR SELECT TO "anon" USING (true);

CREATE POLICY "race_sub_race_prices_admin_insert"
  ON "public"."race_sub_race_prices" FOR INSERT TO "authenticated"
  WITH CHECK ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));

CREATE POLICY "race_sub_race_prices_admin_update"
  ON "public"."race_sub_race_prices" FOR UPDATE TO "authenticated"
  USING ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"))
  WITH CHECK ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));

CREATE POLICY "race_sub_race_prices_admin_delete"
  ON "public"."race_sub_race_prices" FOR DELETE TO "authenticated"
  USING ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));

GRANT SELECT ON TABLE "public"."race_sub_race_prices" TO "anon";
GRANT ALL ON TABLE "public"."race_sub_race_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."race_sub_race_prices" TO "service_role";
