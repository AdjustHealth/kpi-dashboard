-- Clinical Training — a joint/condition curriculum the practice already ran
-- off a Google Sheet ("Training Log" tab), grouped by experience/discipline
-- (New Graduates, Associate Physio, Senior Physio, Exercise Physiology,
-- Massage Therapy — see lib/trainingGroup.ts for the single source of truth
-- on group ids/labels and how a provider maps to one). A topic is ticked
-- complete per provider by a director — never by the provider themselves,
-- per the clinic's explicit requirement — which is enforced here at the RLS
-- level (not just hidden in the UI) so a staff login can never write its own
-- completion row even via a direct API call.
create table training_topics (
  id uuid primary key default gen_random_uuid(),
  training_group text not null,
  category text,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- One row per (topic, provider) — ticking again just moves completed_at/
-- marked_by/note forward (upsert), unticking deletes the row. marked_by is
-- plain text (not a providers FK) because the director doing the ticking
-- isn't necessarily a tracked clinician themselves (e.g. Michael has no
-- providers row) — just whoever's name they picked when they ticked it.
create table training_completions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references training_topics(id) on delete cascade,
  provider_id uuid not null references providers(id) on delete cascade,
  completed_at date not null,
  marked_by text,
  note text,
  created_at timestamptz not null default now(),
  unique (topic_id, provider_id)
);

create index training_completions_provider_idx on training_completions(provider_id);

alter table training_topics enable row level security;
alter table training_completions enable row level security;

-- Read: same "Team" section grant Performance Reviews already uses — see
-- lib/nav.ts's TEAM_GROUP. Write: directors only, at every command, so
-- there's no path (UI or direct API) for a staff login to tick its own box.
create policy "team can read training topics" on training_topics
  for select using (can_access_section('team'));
create policy "directors insert training topics" on training_topics
  for insert with check (is_director_user());
create policy "directors update training topics" on training_topics
  for update using (is_director_user()) with check (is_director_user());
create policy "directors delete training topics" on training_topics
  for delete using (is_director_user());

create policy "team can read training completions" on training_completions
  for select using (can_access_section('team'));
create policy "directors insert training completions" on training_completions
  for insert with check (is_director_user());
create policy "directors update training completions" on training_completions
  for update using (is_director_user()) with check (is_director_user());
create policy "directors delete training completions" on training_completions
  for delete using (is_director_user());

-- Seed: the real curriculum from the director's own Training Log sheet,
-- plus the cross-cutting/common-condition gaps identified and approved
-- while designing this feature (each commented below). No seeded
-- completions — every tick from here on should be a real one, not a
-- carried-over guess at who'd already done what.

-- New Graduates (18) — the sheet's "Tier 1 — New Grad / Foundation" list,
-- one topic per joint/region, plus 3 added Clinical Foundations topics
-- that don't belong to any single joint.
insert into training_topics (training_group, category, name, sort_order) values
('new_grad', 'Clinical Foundations', 'Outcome Measures & Baseline Documentation', 1),
('new_grad', 'Clinical Foundations', 'Exercise Prescription Fundamentals', 2),
('new_grad', 'Clinical Foundations', 'Red Flag Screening', 3),
('new_grad', 'Spine', 'Lumbar Spine', 10),
('new_grad', 'Spine', 'Cervical Spine', 11),
('new_grad', 'Spine', 'Thoracic Spine', 12),
('new_grad', 'Spine', 'SIJ', 13),
('new_grad', 'Spine', 'TMJ', 14),
('new_grad', 'Spine', 'Upper Cervical & Headache', 15),
('new_grad', 'Upper Limb', 'Shoulder', 20),
('new_grad', 'Upper Limb', 'Elbow & Forearm', 21),
('new_grad', 'Upper Limb', 'Wrist & Hand', 22),
('new_grad', 'Lower Limb', 'Hip & Groin', 30),
('new_grad', 'Lower Limb', 'Knee', 31),
('new_grad', 'Lower Limb', 'Ankle & Foot', 32),
('new_grad', 'Clinical Skills', 'Taping', 40),
('new_grad', 'Clinical Skills', 'Pain Science & Central Sensitisation', 41),
('new_grad', 'Clinical Skills', 'NDIS Clinical', 42);

-- Associate Physio (37) — merges the sheet's "Tier 2 — Developing" and
-- "Tier 3 — Advanced" lists into one group, plus 6 added condition gaps
-- (Patellar Tendinopathy, De Quervain's, Whiplash, both joint replacements,
-- Vestibular Rehabilitation) that weren't covered by any existing topic.
insert into training_topics (training_group, category, name, sort_order) values
('associate', 'Hip & Pelvis', 'Femoral Acetabular Impingement (FAI)', 10),
('associate', 'Hip & Pelvis', 'Deep Gluteal Pain Syndrome', 11),
('associate', 'Hip & Pelvis', 'SIJ Dysfunction — Advanced', 12),
('associate', 'Hip & Pelvis', 'Adductor Related Groin Pain', 13),
('associate', 'Hip & Pelvis', 'Hamstring Tendinopathy', 14),
('associate', 'Hip & Pelvis', 'Lumbar Spondylolisthesis', 15),
('associate', 'Lower Limb', 'Chondromalacia Patellae', 20),
('associate', 'Lower Limb', 'ACL Reconstruction Rehab', 21),
('associate', 'Lower Limb', 'Hamstring Tears', 22),
('associate', 'Lower Limb', 'High Ankle Sprain', 23),
('associate', 'Lower Limb', 'Patellar Tendinopathy', 24),
('associate', 'Lower Limb', 'Meniscus Repair — Post Op', 25),
('associate', 'Lower Limb', 'Lateral Ankle Reconstruction / Conservative', 26),
('associate', 'Lower Limb', 'Trochanteric Pain Syndrome', 27),
('associate', 'Lower Limb', 'Plantar Fasciitis — Advanced', 28),
('associate', 'Upper Limb', 'SLAP Tears', 30),
('associate', 'Upper Limb', 'Cubital Tunnel Syndrome', 31),
('associate', 'Upper Limb', 'Frozen Shoulder', 32),
('associate', 'Upper Limb', 'Thoracic Outlet Syndrome (TOS)', 33),
('associate', 'Upper Limb', 'De Quervain''s Tenosynovitis', 34),
('associate', 'Upper Limb', 'Rotator Cuff Related Pain Syndrome', 35),
('associate', 'Upper Limb', 'Rotator Cuff Repair — Post Op', 36),
('associate', 'Upper Limb', 'Lateral Elbow Pain — Advanced', 37),
('associate', 'Spine & Jaw', 'TMJ Dysfunction — Advanced', 40),
('associate', 'Spine & Jaw', 'Cervical Radiculopathy', 41),
('associate', 'Spine & Jaw', 'Lumbar Disc Bulges — Advanced', 42),
('associate', 'Spine & Jaw', 'Costovertebral Joint Dysfunction', 43),
('associate', 'Spine & Jaw', 'Whiplash-Associated Disorder (WAD)', 44),
('associate', 'Joint Replacement', 'Total Hip Replacement — Post Op', 50),
('associate', 'Joint Replacement', 'Total Knee Replacement — Post Op', 51),
('associate', 'Head & Complex', 'Watson Headache — Advanced', 60),
('associate', 'Head & Complex', 'Vestibular Rehabilitation — Advanced', 61),
('associate', 'Head & Complex', 'Paediatric & Growth-Related Injuries', 62),
('associate', 'Head & Complex', 'Complex Chronic Pain & Biopsychosocial', 63),
('associate', 'Head & Complex', 'Return to Sport — Advanced Load Management', 64),
('associate', 'Clinical Frameworks', 'Load Management & Return to Function', 70),
('associate', 'Clinical Frameworks', 'Chronic Pain Management Frameworks', 71);

-- Senior Physio (2) — Michael's own open-ended list ("MH to add weekly" on
-- the sheet); starts with just the 2 real topics logged so far, grown from
-- the UI's own "+ Add topic" from here on rather than guessed at.
insert into training_topics (training_group, category, name, sort_order) values
('senior_physio', 'Force Testing in Rehab', 'Force Testing in Rehab — Ankle', 1),
('senior_physio', 'Force Testing in Rehab', 'Force Testing in Rehab — Shoulder', 2);

-- Exercise Physiology and Massage Therapy deliberately seed with no topics —
-- the sheet only had a bare column header for each, so there's no real
-- curriculum to carry over. A director adds their first topic from the
-- group's own page.
