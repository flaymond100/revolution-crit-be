INSERT INTO "public"."race_categories" ("id", "label")
  VALUES ('frauen', 'Frauen')
  ON CONFLICT ("id") DO UPDATE SET "label" = EXCLUDED."label";
