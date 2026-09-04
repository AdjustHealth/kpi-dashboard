-- The director wants two PVA figures tracked in parallel going forward:
-- the raw "with pre-employment" Services/Unique-Patients (we already have
-- this data, no reason to wait), and the corporate-screening/pre-
-- employment-excluded cut as the real rolling-12-month figure meant to
-- eventually replace UCVA. Table was empty (no Activity Report uploaded
-- since it was created), so this is a plain rename + add, no data to move.
alter table activity_pva_weekly rename column services to services_excl_pre_employment;
alter table activity_pva_weekly rename column client_names to client_names_excl_pre_employment;

alter table activity_pva_weekly
  add column services_all int not null default 0,
  add column client_names_all jsonb not null default '[]';
