-- Ilan (headaches), Tayla (paediatrics), Nick (hydro + vestibular) and
-- Imogen (women's health) are each a go-to for one clinical specialty,
-- same as Marcio already is for headaches (see 0001_init.sql) -- but
-- nobody ever gave their providers row a specialty_metrics array, so
-- they had no field to log a weekly count into and no trend graph on
-- their own meeting sheet (SpecialtyKpiCard only renders when
-- specialty_metrics is non-empty).
--
-- Only touches a row whose specialty_metrics is still the empty default,
-- so this is safe to run even if one of these was already configured by
-- hand in Settings -- it won't clobber it.
--
-- Nick covers two unrelated specialties. computeSpecialtyCalcMetrics
-- (lib/providerCalc.ts) sums every manual metric in the whole array into
-- a single calc total, so a single array can't hold two independent
-- Init+Sub->Total groups -- his two numbers are tracked as plain manual
-- totals instead (matching how Hydro is already tracked clinic-wide,
-- see 0015_fix_hydro_total_not_generated.sql).
update providers
set specialty_metrics = '[
  {"key":"headache_init","label":"Headache Init","type":"number"},
  {"key":"headache_sub","label":"Headache Sub","type":"number"},
  {"key":"headache_total","label":"Headache Total","type":"number","source":"calc"}
]'::jsonb
where name = 'Ilan Berkowitz' and jsonb_array_length(specialty_metrics) = 0;

update providers
set specialty_metrics = '[
  {"key":"paeds_init","label":"Paediatrics Init","type":"number"},
  {"key":"paeds_sub","label":"Paediatrics Sub","type":"number"},
  {"key":"paeds_total","label":"Paediatrics Total","type":"number","source":"calc"}
]'::jsonb
where name = 'Tayla Cattanach' and jsonb_array_length(specialty_metrics) = 0;

update providers
set specialty_metrics = '[
  {"key":"hydro_total","label":"Hydro Total","type":"number"},
  {"key":"vestib_total","label":"Vestibular Total","type":"number"}
]'::jsonb
where name = 'Nick Baxter' and jsonb_array_length(specialty_metrics) = 0;

update providers
set specialty_metrics = '[
  {"key":"womens_health_init","label":"Women''s Health Init","type":"number"},
  {"key":"womens_health_sub","label":"Women''s Health Sub","type":"number"},
  {"key":"womens_health_total","label":"Women''s Health Total","type":"number","source":"calc"}
]'::jsonb
where name = 'Imogen O''Neill' and jsonb_array_length(specialty_metrics) = 0;
