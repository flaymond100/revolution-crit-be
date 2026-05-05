CREATE POLICY "Authenticated full access" ON "public"."race_sub_race_prices"
  USING (("auth"."role"() = 'authenticated'::"text"))
  WITH CHECK (("auth"."role"() = 'authenticated'::"text"));
