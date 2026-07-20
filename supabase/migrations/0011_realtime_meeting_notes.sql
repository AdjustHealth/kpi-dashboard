-- Let multiple people editing the same provider's Meeting Notes / Action
-- Steps for the same week see each other's saves live, instead of only on
-- next page load. Full replica identity is required for Realtime to include
-- the updated row (not just the changed columns) in its change payload.
alter table provider_weekly replica identity full;
alter publication supabase_realtime add table provider_weekly;
