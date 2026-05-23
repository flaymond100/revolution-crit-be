WITH new_race AS (
  INSERT INTO public.race_calendar (name, race_date, type, location, internal_registration, site)
  VALUES ('Schkeuditz Run 2026', '2026-08-22', 'running', 'Schkeuditz', true, 'schkeuditz_run')
  RETURNING id
)
INSERT INTO public.race_sub_races (race_calendar_id, name, sort_order)
SELECT r.id, s.name, s.sort_order
FROM new_race r,
(VALUES
  ('lauf_5km',         1),
  ('lauf_10km',        2),
  ('u13m_u15w',        3),
  ('u15m_u17w',        4),
  ('u17m_masters4',    5),
  ('masters_2_3',      6),
  ('jedermann_leicht', 7),
  ('kids_races',       8),
  ('jedermann_schwer', 9),
  ('jedefrau',        10)
) AS s(name, sort_order);
