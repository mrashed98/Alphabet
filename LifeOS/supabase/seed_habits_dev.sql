-- Habits Dev Seed
-- Populates habits, habit_logs, and notes for local development.
--
-- Prerequisites:
--   1. Run all migrations up to 20260322040000_habits_domain_schema.sql
--   2. A test user must exist in auth.users. Create one via the Supabase UI
--      (Authentication → Users → Add user) or with the CLI:
--
--        supabase auth signup --email dev@lifeos.local --password password123
--
--      Then set DEV_USER_ID below to that user's UUID.
--
-- Run with service_role (bypasses RLS):
--   psql $DATABASE_URL -v dev_user_id="'<uuid>'" -f seed_habits_dev.sql
--
-- Or inside supabase/seed.sql if you set the variable there.

-- ────────────────────────────────────────────────────────────────────────────
-- CONFIG — replace with your local dev user UUID
-- ────────────────────────────────────────────────────────────────────────────
\set dev_user_id '00000000-0000-0000-0000-000000000099'

-- ────────────────────────────────────────────────────────────────────────────
-- Clean up previous seed data (idempotent re-runs)
-- ────────────────────────────────────────────────────────────────────────────
delete from public.notes        where user_id = :dev_user_id;
delete from public.habit_logs   where user_id = :dev_user_id;
delete from public.habit_streaks
  where habit_id in (select id from public.habits where user_id = :dev_user_id);
delete from public.habits       where user_id = :dev_user_id;

-- ────────────────────────────────────────────────────────────────────────────
-- HABITS
-- ────────────────────────────────────────────────────────────────────────────
insert into public.habits (id, user_id, title, description, frequency, target_days, icon, color, is_archived)
values
  -- Daily habits
  (
    'aaaaaaaa-0001-0000-0000-000000000000',
    :dev_user_id,
    'Morning Meditation',
    '10 minutes of mindfulness to start the day',
    'daily', null, '🧘', '#6C63FF', false
  ),
  (
    'aaaaaaaa-0002-0000-0000-000000000000',
    :dev_user_id,
    'Drink 8 Glasses of Water',
    'Stay hydrated throughout the day',
    'daily', null, '💧', '#3BAFDA', false
  ),
  (
    'aaaaaaaa-0003-0000-0000-000000000000',
    :dev_user_id,
    'Read 20 Pages',
    'Daily reading habit',
    'daily', null, '📚', '#F7A800', false
  ),
  -- Weekly habit — Mon/Wed/Fri (1, 3, 5)
  (
    'aaaaaaaa-0004-0000-0000-000000000000',
    :dev_user_id,
    'Strength Training',
    'Full-body workout: push, pull, legs',
    'weekly', '{1,3,5}', '🏋️', '#E74C3C', false
  ),
  -- Weekly habit — weekdays (1-5)
  (
    'aaaaaaaa-0005-0000-0000-000000000000',
    :dev_user_id,
    'Journal Entry',
    'End-of-day reflection and gratitude',
    'weekly', '{1,2,3,4,5}', '✍️', '#2ECC71', false
  ),
  -- Archived habit (should be hidden by default)
  (
    'aaaaaaaa-0006-0000-0000-000000000000',
    :dev_user_id,
    'Cold Shower',
    'Archived — no longer practicing',
    'daily', null, '🚿', '#95A5A6', true
  );

-- ────────────────────────────────────────────────────────────────────────────
-- HABIT LOGS  (last 30 days of simulated activity)
-- Meditation: completed every day for the past 14 days (active streak = 14)
-- Water:      completed most days; missed 3 days ago (streak broken → 2)
-- Reading:    sporadic — no current streak
-- Strength:   completed every scheduled session for the past 2 weeks
-- Journal:    completed weekdays for past week
-- ────────────────────────────────────────────────────────────────────────────

-- Helper: generate_series-based bulk insert for meditation (14-day streak)
insert into public.habit_logs (habit_id, user_id, date, completed_at)
select
  'aaaaaaaa-0001-0000-0000-000000000000',
  :dev_user_id,
  (current_date - s)::date,
  (current_date - s + time '08:05:00')::timestamptz
from generate_series(0, 13) s;

-- Water: completed today and yesterday but NOT 3 days ago (streak = 2)
insert into public.habit_logs (habit_id, user_id, date, completed_at)
select
  'aaaaaaaa-0002-0000-0000-000000000000',
  :dev_user_id,
  (current_date - s)::date,
  (current_date - s + time '09:00:00')::timestamptz
from generate_series(0, 1) s  -- today and yesterday
union all
select
  'aaaaaaaa-0002-0000-0000-000000000000',
  :dev_user_id,
  (current_date - s)::date,
  (current_date - s + time '09:00:00')::timestamptz
from generate_series(4, 14) s;  -- 5–14 days ago (gap on day 2 and 3)

-- Reading: completed 5 days ago, 8 days ago, 12 days ago (no streak)
insert into public.habit_logs (habit_id, user_id, date, completed_at)
select
  'aaaaaaaa-0003-0000-0000-000000000000',
  :dev_user_id,
  (current_date - s)::date,
  (current_date - s + time '21:30:00')::timestamptz
from (values (5), (8), (12), (19), (25)) v(s);

-- Strength Training: completed every Mon/Wed/Fri for last 2 weeks
-- We insert for all days and let the heatmap function figure out due status.
-- Only insert days that fall on Mon(1), Wed(3), Fri(5).
insert into public.habit_logs (habit_id, user_id, date, completed_at)
select
  'aaaaaaaa-0004-0000-0000-000000000000',
  :dev_user_id,
  d::date,
  (d + time '18:00:00')::timestamptz
from generate_series(current_date - 14, current_date, '1 day'::interval) d
where extract(dow from d)::int in (1, 3, 5)
  and d < current_date;  -- don't pre-fill today

-- Journal: completed every weekday for the last 7 days
insert into public.habit_logs (habit_id, user_id, date, completed_at)
select
  'aaaaaaaa-0005-0000-0000-000000000000',
  :dev_user_id,
  d::date,
  (d + time '22:00:00')::timestamptz
from generate_series(current_date - 7, current_date - 1, '1 day'::interval) d
where extract(dow from d)::int between 1 and 5;

-- ────────────────────────────────────────────────────────────────────────────
-- NOTES
-- ────────────────────────────────────────────────────────────────────────────
insert into public.notes (user_id, habit_id, title, body, pinned)
values
  (
    :dev_user_id,
    'aaaaaaaa-0001-0000-0000-000000000000',
    'Meditation Technique Notes',
    E'## Box Breathing\n- Inhale 4s\n- Hold 4s\n- Exhale 4s\n- Hold 4s\n\nWorks great for pre-workout focus too.',
    true
  ),
  (
    :dev_user_id,
    'aaaaaaaa-0003-0000-0000-000000000000',
    'Current Reading List',
    E'1. **Atomic Habits** — James Clear ✅\n2. **Deep Work** — Cal Newport (in progress)\n3. **The Almanack of Naval Ravikant** — next up',
    false
  ),
  (
    :dev_user_id,
    null,
    'Wellness Goals Q1 2026',
    E'- Hit 30-day meditation streak\n- Drink water consistently\n- Start morning run routine in April',
    true
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Verify counts
-- ────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_habits  int;
  v_logs    int;
  v_streaks int;
  v_notes   int;
begin
  select count(*) into v_habits  from public.habits      where user_id = '00000000-0000-0000-0000-000000000099';
  select count(*) into v_logs    from public.habit_logs  where user_id = '00000000-0000-0000-0000-000000000099';
  select count(*) into v_streaks from public.habit_streaks
    where habit_id in (select id from public.habits where user_id = '00000000-0000-0000-0000-000000000099');
  select count(*) into v_notes   from public.notes       where user_id = '00000000-0000-0000-0000-000000000099';

  raise notice 'Seed complete — habits: %, logs: %, streaks: %, notes: %',
    v_habits, v_logs, v_streaks, v_notes;
end $$;
