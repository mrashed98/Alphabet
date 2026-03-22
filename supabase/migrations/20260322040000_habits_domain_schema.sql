-- Habits Domain Schema
-- LOG-20: Supabase schema, RLS policies, REST API endpoints
--
-- Runs AFTER:
--   20260322000000_initial_schema.sql     (auth_uid, uuid-ossp, set_updated_at)
--   20260322010000_tasks_domain_schema.sql
--   20260322030001_holidays_seed.sql
--
-- Creates:
--   1. habit_frequency enum
--   2. habits             — core habit definitions
--   3. habit_logs         — daily check-in records (mobile: habit_logs.date + completed_at)
--   4. habit_streaks      — materialized streak cache (auto-updated via trigger)
--   5. notes              — free-form notes, optionally linked to a habit or task
--   6. calculate_habit_streak()   — PL/pgSQL RPC (PostgREST: POST /rpc/calculate_habit_streak)
--   7. sync_habit_streak_on_log() — trigger to keep habit_streaks in sync
--   8. get_habit_heatmap()        — RPC returning date-status rows for calendar view
--
-- Column names match the TypeScript types in LifeOS/types/index.ts and
-- the Zustand store in LifeOS/stores/habitStore.ts exactly.

-- ============================================================
-- 1. ENUM
-- ============================================================
do $$ begin
  create type habit_frequency as enum ('daily', 'weekly');
exception when duplicate_object then null;
end $$;

-- ============================================================
-- 2. HABITS
-- ============================================================
create table if not exists public.habits (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null,
  description text,
  frequency   habit_frequency not null default 'daily',
  target_days int[],          -- 0=Sun … 6=Sat; NULL / empty = all days due
  icon        text,           -- emoji or icon key
  color       text,           -- hex colour e.g. '#6C63FF'
  is_archived boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.habits enable row level security;

create policy "Users manage own habits" on public.habits
  using  (user_id = auth_uid())
  with check (user_id = auth_uid());

-- Active habits lookup (most common query path)
create index if not exists idx_habits_user_active
  on public.habits(user_id)
  where is_archived = false;

-- Includes archived (used by ?include_archived=true)
create index if not exists idx_habits_user_all
  on public.habits(user_id, created_at desc);

create trigger habits_set_updated_at
  before update on public.habits
  for each row execute procedure set_updated_at();

-- ============================================================
-- 3. HABIT LOGS  (one row per habit per day)
-- ============================================================
create table if not exists public.habit_logs (
  id           uuid        primary key default uuid_generate_v4(),
  habit_id     uuid        not null references public.habits(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  date         date        not null,           -- YYYY-MM-DD of the completion
  completed_at timestamptz not null default now(),  -- exact moment of check-in
  constraint habit_logs_habit_date_uniq unique (habit_id, date)
);

alter table public.habit_logs enable row level security;

create policy "Users manage own habit logs" on public.habit_logs
  using  (user_id = auth_uid())
  with check (user_id = auth_uid());

-- Primary lookup: all logs for a habit ordered by date
create index if not exists idx_habit_logs_habit_date
  on public.habit_logs(habit_id, date desc);

-- Cross-habit lookup for a user on a given day (today view)
create index if not exists idx_habit_logs_user_date
  on public.habit_logs(user_id, date desc);

-- ============================================================
-- 4. HABIT STREAKS  (materialized cache — auto-updated by trigger)
-- ============================================================
create table if not exists public.habit_streaks (
  habit_id        uuid primary key references public.habits(id) on delete cascade,
  current_streak  int  not null default 0,
  longest_streak  int  not null default 0,
  last_completed  date,
  updated_at      timestamptz not null default now()
);

alter table public.habit_streaks enable row level security;

-- Read-only for the habit owner (streak is managed by trigger, not client writes)
create policy "Users read own habit streaks" on public.habit_streaks
  for select
  using (
    exists (
      select 1 from public.habits
      where id = habit_id and user_id = auth_uid()
    )
  );

-- ============================================================
-- 5. NOTES
-- ============================================================
create table if not exists public.notes (
  id             uuid        primary key default uuid_generate_v4(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  habit_id       uuid        references public.habits(id) on delete set null,
  linked_task_id uuid        references public.tasks(id)  on delete set null,
  title          text        not null default '',
  body           text,
  pinned         boolean     not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "Users manage own notes" on public.notes
  using  (user_id = auth_uid())
  with check (user_id = auth_uid());

-- Main list: pinned first, then most recently updated
create index if not exists idx_notes_user_list
  on public.notes(user_id, pinned desc, updated_at desc);

-- Filter by linked habit
create index if not exists idx_notes_habit
  on public.notes(habit_id)
  where habit_id is not null;

-- Filter by linked task
create index if not exists idx_notes_task
  on public.notes(linked_task_id)
  where linked_task_id is not null;

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute procedure set_updated_at();

-- ============================================================
-- 6. STREAK CALCULATION FUNCTION
--    Called by the trigger below and also exposed as a PostgREST RPC:
--    POST /rest/v1/rpc/calculate_habit_streak
--    Body: { "p_habit_id": "<uuid>" }
-- ============================================================
create or replace function calculate_habit_streak(p_habit_id uuid)
returns table(current_streak int, longest_streak int, last_completed date)
language plpgsql stable security definer as $$
declare
  v_target_days int[];
  v_today       date    := current_date;
  v_log_dates   date[];
  v_min_date    date;
  v_current     int     := 0;
  v_longest     int     := 0;
  v_run         int     := 0;
  v_last        date;
  v_check       date;
  v_is_due      bool;
begin
  -- Load habit config
  select target_days
  into   v_target_days
  from   public.habits
  where  id = p_habit_id;

  if not found then
    return query select 0::int, 0::int, null::date;
    return;
  end if;

  -- Load all log dates into memory (avoids per-day queries in the loops below)
  select array_agg(date order by date)
  into   v_log_dates
  from   public.habit_logs
  where  habit_id = p_habit_id;

  if v_log_dates is null or array_length(v_log_dates, 1) = 0 then
    return query select 0::int, 0::int, null::date;
    return;
  end if;

  v_min_date := v_log_dates[1];
  v_last     := v_log_dates[array_length(v_log_dates, 1)];

  -- ── Current streak ───────────────────────────────────────────────────────
  -- Walk backward from today.  First missed due day ends the streak.
  -- Grace rule: if today is a due day but not yet checked in, do not break.
  v_check := v_today;
  loop
    exit when v_check < v_min_date;

    if v_target_days is null or array_length(v_target_days, 1) = 0 then
      v_is_due := true;
    else
      v_is_due := (extract(dow from v_check)::int) = any(v_target_days);
    end if;

    if v_is_due then
      if v_check = any(v_log_dates) then
        v_current := v_current + 1;
      elsif v_check = v_today then
        null; -- grace: today not yet completed, don't break streak
      else
        exit; -- missed a due day → streak is over
      end if;
    end if;

    v_check := v_check - 1;
  end loop;

  -- ── Longest streak ───────────────────────────────────────────────────────
  -- Walk forward from earliest log date to today, counting max consecutive run.
  v_check := v_min_date;
  v_run   := 0;
  loop
    exit when v_check > v_today;

    if v_target_days is null or array_length(v_target_days, 1) = 0 then
      v_is_due := true;
    else
      v_is_due := (extract(dow from v_check)::int) = any(v_target_days);
    end if;

    if v_is_due then
      if v_check = any(v_log_dates) then
        v_run := v_run + 1;
        if v_run > v_longest then v_longest := v_run; end if;
      else
        v_run := 0;
      end if;
    end if;

    v_check := v_check + 1;
  end loop;

  return query select v_current, v_longest, v_last;
end;
$$;

-- ============================================================
-- 7. TRIGGER: keep habit_streaks in sync after every log change
-- ============================================================
create or replace function sync_habit_streak_on_log()
returns trigger language plpgsql security definer as $$
declare
  v_habit_id uuid;
  v_current  int;
  v_longest  int;
  v_last     date;
begin
  v_habit_id := coalesce(new.habit_id, old.habit_id);

  select cs, ls, lc
  into   v_current, v_longest, v_last
  from   calculate_habit_streak(v_habit_id) as t(cs int, ls int, lc date);

  insert into public.habit_streaks
    (habit_id, current_streak, longest_streak, last_completed, updated_at)
  values
    (v_habit_id, v_current, v_longest, v_last, now())
  on conflict (habit_id) do update set
    current_streak = excluded.current_streak,
    longest_streak = excluded.longest_streak,
    last_completed = excluded.last_completed,
    updated_at     = excluded.updated_at;

  return coalesce(new, old);
end;
$$;

drop trigger if exists habit_logs_sync_streak on public.habit_logs;
create trigger habit_logs_sync_streak
  after insert or update or delete on public.habit_logs
  for each row execute function sync_habit_streak_on_log();

-- ============================================================
-- 8. HEATMAP RPC
--    Exposed as: POST /rest/v1/rpc/get_habit_heatmap
--    Body: { "p_habit_id": "<uuid>", "p_from": "YYYY-MM-DD", "p_to": "YYYY-MM-DD" }
--    Returns: [{ "heatmap_date": "...", "status": "none|completed|missed|pending" }]
-- ============================================================
create or replace function get_habit_heatmap(
  p_habit_id uuid,
  p_from     date default (current_date - 364),
  p_to       date default  current_date
)
returns table(heatmap_date date, status text)
language sql stable security definer as $$
  with
  h as (
    select target_days from public.habits where id = p_habit_id
  ),
  all_dates as (
    select d::date as dt
    from generate_series(p_from, p_to, '1 day'::interval) d
  ),
  comps as (
    select date as completed_on
    from   public.habit_logs
    where  habit_id = p_habit_id
      and  date between p_from and p_to
  )
  select
    ad.dt as heatmap_date,
    case
      -- Non-target day (weekly habit where this DOW is not scheduled)
      when h.target_days is not null
        and array_length(h.target_days, 1) > 0
        and not (extract(dow from ad.dt)::int = any(h.target_days))
        then 'none'
      -- Completed
      when c.completed_on is not null
        then 'completed'
      -- Past due day with no log
      when ad.dt < current_date
        then 'missed'
      -- Today or future (not yet due)
      else 'pending'
    end as status
  from all_dates ad
  cross join h
  left  join comps c on c.completed_on = ad.dt
  order by ad.dt;
$$;
