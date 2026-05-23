ALTER TABLE public.race_calendar
  ADD COLUMN IF NOT EXISTS site text NOT NULL DEFAULT 'revolution_crit';

UPDATE public.race_calendar SET site = 'revolution_crit' WHERE site IS NULL;
