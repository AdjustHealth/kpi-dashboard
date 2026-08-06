-- Podiatry revenue is only known fortnightly (collected/reconciled every 2
-- weeks, in arrears). The real, un-halved figure is typed in once, into
-- whichever week it comes in, via this new column — the weekly-kpis PATCH
-- handler then automatically splits it in half into that week's AND the
-- previous week's m_pod_rev, instead of manually dividing by 2 and typing
-- the same number into both weeks by hand.
alter table weekly_kpis add column if not exists m_pod_fortnightly numeric;
