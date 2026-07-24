-- A senior physio's review needs a snapshot of their Bonus & Growth
-- numbers (cumulative turnover vs base target, pacing %, bonus tier
-- thresholds, their bonus-linked specialty metric) plus a manual
-- Achieved verdict — kept manual, not auto-computed, same reasoning as
-- BonusTierCard: the exact bonus formula was never confirmed, so the app
-- should never silently declare a tier "reached".
alter table performance_reviews add column if not exists bonus_summary jsonb not null default '{}';
