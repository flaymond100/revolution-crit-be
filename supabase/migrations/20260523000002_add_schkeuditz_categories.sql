-- Dedicated categories table for schkeuditz-run (avoids polluting the shared enum)
CREATE TABLE IF NOT EXISTS public.schkeuditz_categories (
  id          text PRIMARY KEY,
  label       text NOT NULL,
  detail      text,
  sort_order  integer NOT NULL DEFAULT 0
);

ALTER TABLE public.schkeuditz_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read schkeuditz_categories"
  ON public.schkeuditz_categories FOR SELECT
  USING (true);

CREATE POLICY "Authenticated full access schkeuditz_categories"
  ON public.schkeuditz_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Decouple race_sub_races.name from the enum so both sites can use their own category IDs.
-- Existing revolution-crit values are preserved as-is (enum values cast to text transparently).
ALTER TABLE public.race_sub_races
  ALTER COLUMN name TYPE text;
