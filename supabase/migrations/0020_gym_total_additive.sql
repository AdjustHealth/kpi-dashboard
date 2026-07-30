-- Reverses migration 0007. Re-confirmed with the director: Total Gym Income
-- is actually Glofox Income + 3rd Party Gym Income added together, not 3rd
-- Party as a subset already reconciled into Glofox Income.
alter table weekly_kpis drop column gym_total;
alter table weekly_kpis add column gym_total numeric generated always as (
  coalesce(m_glofox, 0) + coalesce(m_gym3p, 0)
) stored;
