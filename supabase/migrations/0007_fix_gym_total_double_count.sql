-- Gym Total was double-counting: 3rd Party Gym Revenue (m_gym3p) is already
-- included within Glofox Income (m_glofox) — Glofox reconciles 3rd-party-
-- collected payments into the same total — so adding it again on top was
-- inflating Gym Total by the 3rd party amount every week. Confirmed
-- directly by the director ("gym revenue is 3100 total, the 700 was from
-- within that").
alter table weekly_kpis drop column gym_total;
alter table weekly_kpis add column gym_total numeric generated always as (
  coalesce(m_glofox, 0)
) stored;
