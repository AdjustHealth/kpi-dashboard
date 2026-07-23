-- specialty_hydro_total was a generated column (initial + sub), matching
-- Vestibular/Headaches/Paeds — those specialties reliably say "Initial"/
-- "Subsequent" in every real item name (confirmed: 15/15 real Details rows
-- for 11/7), so initial+sub really does equal the true total for them. Hydro
-- doesn't follow that convention (most real item names are just "Private
-- Hydrotherapy 30 min", "DVA Hydrotherapy PH60", generic — no init/sub
-- distinction), so initial+sub silently undercounted the real total (1
-- instead of 8 genuine matching rows for 11/7). Un-generate it so the
-- parser can write the real total directly.
alter table weekly_kpis drop column specialty_hydro_total;
alter table weekly_kpis add column specialty_hydro_total int;
