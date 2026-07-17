-- Move Strong Credits (m_mscred) is no longer tracked. gym_total is a
-- generated column, so it's recreated without m_mscred rather than altered
-- in place (Postgres can't change a generated column's expression).
-- The m_mscred column itself is left in place (unused, no data loss) —
-- only the derived total changes.
alter table weekly_kpis drop column gym_total;
alter table weekly_kpis add column gym_total numeric generated always as (
  coalesce(m_glofox, 0) + coalesce(m_gym3p, 0)
) stored;
