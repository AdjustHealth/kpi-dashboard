-- Performance Reviews — one row per review sit-down (annual for most staff,
-- 6-monthly for new grads). Replaces the director's manual KPI-averaging
-- spreadsheet: "Prep Review" snapshots rolling averages + current goals at
-- the time it's created, so the numbers on a completed review never drift
-- even as later weekly data comes in. Lives on its own route, separate from
-- the provider's regular weekly meeting page, since that page is shown to
-- the provider during weekly meetings and this shouldn't be.
create table performance_reviews (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  review_date date not null default current_date,
  -- null = still in progress ("due"); set when the director marks it done.
  -- Reviews stay fully editable after completion, this is just for the
  -- Reviews list's Due/Completed split, not a lock.
  completed_at timestamptz,
  reviewer text,
  -- Snapshot of providers.goals at prep time: [{ text, achieved, term, note }]
  -- — "term" and "note" are filled in during the review, text/achieved are
  -- copied from the goal as it stood when Prep Review was clicked.
  goals_reflection jsonb not null default '[]',
  proud_of text[] not null default '{}',
  areas_for_growth text[] not null default '{}',
  -- { short_term: [{text, how}], long_term: [{text, how}] }
  new_goals jsonb not null default '{"short_term": [], "long_term": []}',
  other_notes text,
  -- Rolling averages computed once at prep time: { [kpiFieldKey]: { "6mth": number|null, "1yr":..., "2yr":..., "3yr":... } }
  kpi_rollups jsonb not null default '{}',
  -- Same shape, values are the modal KPA rating for that window instead of a number.
  kpa_rollups jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index performance_reviews_provider_id_idx on performance_reviews (provider_id);
create index performance_reviews_review_date_idx on performance_reviews (review_date);

alter table performance_reviews enable row level security;
create policy "authenticated full access" on performance_reviews
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create trigger performance_reviews_set_updated_at before update on performance_reviews
  for each row execute function set_updated_at();
