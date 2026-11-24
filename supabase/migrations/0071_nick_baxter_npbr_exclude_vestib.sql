-- "Include vestibular in Nick Baxter's new patients, but don't include it
-- in his NPBR statistic" -- the code (npbr_exclude_keyword, see
-- parseClientsAndCasesReport/lib/nookal/parsers.ts) has supported this
-- since it was built, but nobody ever actually set the keyword on his
-- providers row, so vestibular clients have been counting toward his NPBR
-- this whole time regardless.
alter table providers disable trigger providers_restrict_director_only_columns;

update providers
set targets = coalesce(targets, '{}'::jsonb) || '{"npbr_exclude_keyword": "vestib"}'::jsonb
where name = 'Nick Baxter';

alter table providers enable trigger providers_restrict_director_only_columns;
