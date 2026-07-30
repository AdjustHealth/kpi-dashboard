-- Consolidating the Email Opt-ins group down to the one field the director
-- actually wants: % of new clients subscribed. Website opt-in count and
-- NC emails collected % weren't adding anything beyond that.
alter table weekly_kpis
  drop column if exists admin_website_optin_pct,
  drop column if exists admin_new_client_emails;
