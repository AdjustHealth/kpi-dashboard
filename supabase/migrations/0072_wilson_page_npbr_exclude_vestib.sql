-- Same as Nick Baxter (0071) -- when Wilson Page sees a vestibular client,
-- it counts as a new patient but is excluded from his NPBR statistic.
alter table providers disable trigger providers_restrict_director_only_columns;

update providers
set targets = coalesce(targets, '{}'::jsonb) || '{"npbr_exclude_keyword": "vestib"}'::jsonb
where name = 'Wilson Page';

alter table providers enable trigger providers_restrict_director_only_columns;
