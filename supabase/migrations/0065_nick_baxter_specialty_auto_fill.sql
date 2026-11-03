-- Nick Baxter's Hydro Total and Vestibular Total have sat manual-entry-only
-- since 0055 (nobody has been typing a number in each week, so they show
-- empty) -- the app already auto-computes clinic-wide vestibular/hydro
-- consult counts from the Activity Report (see lib/nookal/parsers.ts's
-- SPECIALTY_CATEGORY_PATTERNS), the same mechanism Marcio's Headache Total
-- and Imogen's Women's Health Total already use. This wires Nick into it.
--
-- Vestibular items reliably say "Initial"/"Subsequent" (same as Headache/
-- Paeds/Women's Health), so it gets the same Init+Sub -> calc(Total)
-- pattern as those. Hydro items usually DON'T (confirmed in
-- 0015_fix_hydro_total_not_generated.sql -- Init+Sub badly undercounts it),
-- so it keeps its flat total field and instead gets the real matched-row
-- total written to it directly every week (new
-- specialty_clinic_wide_direct_total_key mechanism in applyReport.ts) --
-- it is NOT marked "calc" in this schema, since the Specialty KPIs card
-- computes a "calc" field client-side as a sum of sibling manual fields,
-- which would show 0 for Hydro (it has no init/sub siblings); it needs to
-- keep displaying whatever the server actually wrote.
update providers
set specialty_metrics = '[
  {"key":"hydro_total","label":"Hydro Total","type":"number"},
  {"key":"vestib_init","label":"Vestibular Init","type":"number"},
  {"key":"vestib_sub","label":"Vestibular Sub","type":"number"},
  {"key":"vestib_total","label":"Vestibular Total","type":"number","source":"calc"}
]'::jsonb
where name = 'Nick Baxter';

update providers
set targets = coalesce(targets, '{}'::jsonb) || '{"specialty_clinic_wide_key":"vestib","specialty_clinic_wide_direct_total_key":"hydro"}'::jsonb
where name = 'Nick Baxter';
