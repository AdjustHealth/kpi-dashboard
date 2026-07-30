-- Last remaining manual ageing-debt field. Director confirmed it isn't
-- needed on the sheet — ad_total_private (auto-filled from the Aged
-- Debtors report) stays as the only Private ageing-debt figure.
alter table weekly_kpis drop column if exists ad_actual_private;
