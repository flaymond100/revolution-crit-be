INSERT INTO "public"."race_categories" ("id", "label") VALUES
  ('men_under_18',    'Men under 18'),
  ('women_under_18',  'Women under 18'),
  ('men_over_18',     'Men over 18'),
  ('women_over_18',   'Women over 18')
ON CONFLICT ("id") DO UPDATE SET "label" = EXCLUDED."label";
