-- Adds the "Senior (6+ yrs)" tier to the clinic-wide CVA breakdown, per the
-- director's paper notes: physio(2-5yrs), senior(6+yrs), new grad, massage, EP.
-- Run this after 0001_init.sql and 0002_payer_revenue.sql.

alter table weekly_kpis
  add column if not exists cva_senior numeric;
