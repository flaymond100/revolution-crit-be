INSERT INTO public.schkeuditz_categories (id, label, detail, sort_order) VALUES
  ('lauf_5km',         '5km-Lauf',          '5 Runden',    1),
  ('lauf_10km',        '10km Lauf',          '10 Runden',   2),
  ('u13m_u15w',        'U13m / U15w',        '20 Runden',   3),
  ('u15m_u17w',        'U15m / U17w',        '25 Runden',   4),
  ('u17m_masters4',    'U17m / Masters 4',   '35 Runden',   5),
  ('masters_2_3',      'Masters 2/3',        '45 Runden',   6),
  ('jedermann_leicht', 'Jedermann leicht',   '45 Minuten',  7),
  ('kids_races',       'Kids Races',         '',            8),
  ('jedermann_schwer', 'Jedermann schwer',   '60 Minuten',  9),
  ('jedefrau',         'Jedefrau',           '45 Minuten',  10)
ON CONFLICT (id) DO UPDATE SET
  label      = EXCLUDED.label,
  detail     = EXCLUDED.detail,
  sort_order = EXCLUDED.sort_order;
