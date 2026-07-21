-- admin_followup_calls was declared `int` back when it was a raw count field
-- (see 0001_init.sql). It was relabelled to a percent (type: "percent" in
-- lib/schema.ts) later, but the column itself was never migrated — so any
-- 0-1 fraction saved against it (e.g. 0.93) silently rounds to 0 or 1 on
-- write. Backfill the one stale whole-number value first (93 -> 0.93),
-- then widen the column so future percent saves aren't truncated.
update weekly_kpis
set admin_followup_calls = admin_followup_calls / 100.0
where admin_followup_calls is not null and admin_followup_calls > 1;

alter table weekly_kpis alter column admin_followup_calls type numeric using admin_followup_calls::numeric;
