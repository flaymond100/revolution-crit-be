


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."race_category_id" AS ENUM (
    'jedermann_leicht',
    'jedermann_mittel',
    'jedermann_schwer',
    'jedefrau',
    'maenner_elite',
    'masters_2',
    'masters_3',
    'masters_4',
    'frauen_elite',
    'u11w',
    'u11m',
    'u13w',
    'u13m',
    'u15w',
    'u15m',
    'u17w',
    'u17m',
    'juniorinnen',
    'junioren',
    'fixed_gear_men',
    'flinta'
);


ALTER TYPE "public"."race_category_id" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "date_of_birth" "date",
    "gender" "text",
    "team_name" "text",
    "nationality" "text",
    "email" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "participants_gender_check" CHECK ((("gender" IS NULL) OR ("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text"]))))
);


ALTER TABLE "public"."participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."race_calendar" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "race_date" "date" NOT NULL,
    "type" "text" NOT NULL,
    "location" "text" NOT NULL,
    "external_results_url" "text",
    "external_registration_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."race_calendar" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."race_categories" (
    "id" "public"."race_category_id" NOT NULL,
    "label" "text" NOT NULL
);


ALTER TABLE "public"."race_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."race_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sub_race_id" "uuid" NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "is_paid" boolean DEFAULT false NOT NULL,
    "payment_amount" numeric(10,2),
    "payment_currency" "text" DEFAULT 'EUR'::"text",
    "payment_date" timestamp with time zone,
    "bib_number" "text",
    "position" integer,
    "time_text" "text",
    "status" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "race_entries_status_check" CHECK ((("status" IS NULL) OR ("status" = ANY (ARRAY['finished'::"text", 'dns'::"text", 'dnf'::"text", 'dsq'::"text"]))))
);


ALTER TABLE "public"."race_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."race_sub_races" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "race_calendar_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."race_sub_races" OWNER TO "postgres";


ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."race_calendar"
    ADD CONSTRAINT "race_calendar_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."race_categories"
    ADD CONSTRAINT "race_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."race_entries"
    ADD CONSTRAINT "race_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."race_entries"
    ADD CONSTRAINT "race_entries_unique" UNIQUE ("sub_race_id", "participant_id");



ALTER TABLE ONLY "public"."race_sub_races"
    ADD CONSTRAINT "race_sub_races_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."race_sub_races"
    ADD CONSTRAINT "race_sub_races_unique_per_race" UNIQUE ("race_calendar_id", "name");



CREATE INDEX "idx_race_calendar_race_date" ON "public"."race_calendar" USING "btree" ("race_date");



CREATE INDEX "idx_race_entries_participant_id" ON "public"."race_entries" USING "btree" ("participant_id");



CREATE INDEX "idx_race_entries_sub_race_id" ON "public"."race_entries" USING "btree" ("sub_race_id");



CREATE INDEX "idx_race_sub_races_race_calendar_id" ON "public"."race_sub_races" USING "btree" ("race_calendar_id");



CREATE OR REPLACE TRIGGER "set_participants_updated_at" BEFORE UPDATE ON "public"."participants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_race_calendar_updated_at" BEFORE UPDATE ON "public"."race_calendar" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_race_entries_updated_at" BEFORE UPDATE ON "public"."race_entries" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_race_sub_races_updated_at" BEFORE UPDATE ON "public"."race_sub_races" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."race_entries"
    ADD CONSTRAINT "race_entries_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."race_entries"
    ADD CONSTRAINT "race_entries_sub_race_id_fkey" FOREIGN KEY ("sub_race_id") REFERENCES "public"."race_sub_races"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."race_sub_races"
    ADD CONSTRAINT "race_sub_races_race_calendar_id_fkey" FOREIGN KEY ("race_calendar_id") REFERENCES "public"."race_calendar"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated delete" ON "public"."race_calendar" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated full access" ON "public"."participants" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated full access" ON "public"."race_calendar" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated full access" ON "public"."race_entries" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated full access" ON "public"."race_sub_races" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated insert" ON "public"."race_calendar" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated update" ON "public"."race_calendar" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."race_categories" FOR SELECT USING (true);



CREATE POLICY "Public read" ON "public"."race_calendar" FOR SELECT USING (true);



ALTER TABLE "public"."participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "participants_admin_delete" ON "public"."participants" FOR DELETE TO "authenticated" USING ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



CREATE POLICY "participants_admin_insert" ON "public"."participants" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



CREATE POLICY "participants_admin_update" ON "public"."participants" FOR UPDATE TO "authenticated" USING ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



CREATE POLICY "participants_public_select" ON "public"."participants" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."race_calendar" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "race_calendar_admin_delete" ON "public"."race_calendar" FOR DELETE TO "authenticated" USING ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



CREATE POLICY "race_calendar_admin_insert" ON "public"."race_calendar" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



CREATE POLICY "race_calendar_admin_update" ON "public"."race_calendar" FOR UPDATE TO "authenticated" USING ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



CREATE POLICY "race_calendar_public_select" ON "public"."race_calendar" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."race_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."race_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "race_entries_admin_delete" ON "public"."race_entries" FOR DELETE TO "authenticated" USING ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



CREATE POLICY "race_entries_admin_insert" ON "public"."race_entries" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



CREATE POLICY "race_entries_admin_update" ON "public"."race_entries" FOR UPDATE TO "authenticated" USING ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



CREATE POLICY "race_entries_public_select" ON "public"."race_entries" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."race_sub_races" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "race_sub_races_admin_delete" ON "public"."race_sub_races" FOR DELETE TO "authenticated" USING ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



CREATE POLICY "race_sub_races_admin_insert" ON "public"."race_sub_races" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



CREATE POLICY "race_sub_races_admin_update" ON "public"."race_sub_races" FOR UPDATE TO "authenticated" USING ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'user_role'::"text") = 'admin'::"text"));



CREATE POLICY "race_sub_races_public_select" ON "public"."race_sub_races" FOR SELECT TO "anon" USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."participants" TO "anon";
GRANT ALL ON TABLE "public"."participants" TO "authenticated";
GRANT ALL ON TABLE "public"."participants" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."race_calendar" TO "anon";
GRANT ALL ON TABLE "public"."race_calendar" TO "authenticated";
GRANT ALL ON TABLE "public"."race_calendar" TO "service_role";



GRANT ALL ON TABLE "public"."race_categories" TO "anon";
GRANT ALL ON TABLE "public"."race_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."race_categories" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."race_entries" TO "anon";
GRANT ALL ON TABLE "public"."race_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."race_entries" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."race_sub_races" TO "anon";
GRANT ALL ON TABLE "public"."race_sub_races" TO "authenticated";
GRANT ALL ON TABLE "public"."race_sub_races" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































