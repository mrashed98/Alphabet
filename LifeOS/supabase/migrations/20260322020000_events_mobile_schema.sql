-- Events Mobile Schema — LOG-27
-- Adds columns required by the Events Squad sprint (mobile engineer scope)

-- ============================================================
-- CONTACTS — add photo_url
-- ============================================================
alter table public.contacts
  add column if not exists photo_url text;

-- ============================================================
-- LIFE EVENTS — add recurring, notes, per-event notification toggles
-- ============================================================
alter table public.life_events
  add column if not exists recurring       boolean not null default false,
  add column if not exists notes           text,
  add column if not exists notify_1_month  boolean not null default false,
  add column if not exists notify_1_week   boolean not null default true,
  add column if not exists notify_1_day    boolean not null default true;

-- ============================================================
-- NOTIFICATION PREFERENCES — user-level toggle + quiet hours
-- ============================================================
create table if not exists public.notification_preferences (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references auth.users(id) on delete cascade unique,
  birthdays_enabled    boolean not null default true,
  life_events_enabled  boolean not null default true,
  tasks_enabled        boolean not null default true,
  quiet_hours_start    time,    -- e.g. '22:00'
  quiet_hours_end      time,    -- e.g. '08:00'
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
create policy "Users manage own notification preferences" on public.notification_preferences
  using (user_id = auth_uid())
  with check (user_id = auth_uid());
