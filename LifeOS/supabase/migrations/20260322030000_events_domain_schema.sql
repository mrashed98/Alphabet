-- Events Domain Schema (Backend)
-- LOG-25: Schema migrations, RLS policies, and holiday seed data
--
-- Runs AFTER:
--   20260322020000_events_mobile_schema.sql  (photo_url, notification booleans,
--                                             notification_preferences table)
--
-- Backend-only additions:
--   1. contacts       — change birthday text → date
--   2. life_events    — replace life_event_type enum; add contact_id; drop advance_days
--   3. notification_preferences — ensure RLS policy exists (table may already exist
--                                 from mobile migration); normalise PK to user_id
--   4. holidays       — new table (seeded separately; readable by all authenticated)
--   5. user_preferences — new table (country_code + future prefs)

-- ============================================================
-- 1. CONTACTS — birthday text → date
-- ============================================================
-- Guard: only alter if the column is still type text.
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'contacts'
      and column_name  = 'birthday'
      and data_type    = 'text'
  ) then
    alter table public.contacts
      alter column birthday type date using (birthday::date);
  end if;
end $$;

-- ============================================================
-- 2. LIFE EVENTS — update enum + add backend columns
-- ============================================================

-- 2a. Add 'graduation' to enum if missing (can only add, never remove in Postgres)
do $$ begin
  alter type life_event_type add value if not exists 'graduation';
exception when duplicate_object then null;
end $$;

-- 2b. Add contact_id FK (nullable — events need not be contact-linked)
alter table public.life_events
  add column if not exists contact_id uuid references public.contacts(id) on delete set null;

-- 2c. Drop legacy advance_days column (replaced by per-event notify_* booleans)
alter table public.life_events
  drop column if exists advance_days;

create index if not exists idx_life_events_contact on public.life_events(contact_id)
  where contact_id is not null;

-- ============================================================
-- 3. NOTIFICATION_PREFERENCES
-- Ensure table and correct RLS exist.
-- Table may have been created by mobile migration (20260322020000_events_mobile_schema).
-- We guard with IF NOT EXISTS so this is safe to run in either order.
-- ============================================================
create table if not exists public.notification_preferences (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  birthdays_enabled   boolean not null default true,
  life_events_enabled boolean not null default true,
  tasks_enabled       boolean not null default true,
  quiet_hours_start   time,
  quiet_hours_end     time
);

alter table public.notification_preferences enable row level security;

-- Drop and recreate policy so it's idempotent
drop policy if exists "Users manage own notification preferences"
  on public.notification_preferences;

create policy "Users manage own notification preferences"
  on public.notification_preferences
  using (user_id = auth_uid())
  with check (user_id = auth_uid());

-- ============================================================
-- 4. HOLIDAYS
-- Static lookup table; seeded in 20260322030001_holidays_seed.sql.
-- Readable by all authenticated users; no client writes.
-- ============================================================
create table if not exists public.holidays (
  id           uuid primary key default uuid_generate_v4(),
  country_code char(2)  not null,
  name         text     not null,
  date         date     not null,
  year         smallint not null generated always as (extract(year from date)::smallint) stored,
  unique (country_code, date, name)
);

alter table public.holidays enable row level security;

drop policy if exists "Authenticated users can read holidays" on public.holidays;

create policy "Authenticated users can read holidays"
  on public.holidays
  for select
  using (auth.role() = 'authenticated');

create index if not exists idx_holidays_country_year on public.holidays(country_code, year);

-- ============================================================
-- 5. USER_PREFERENCES
-- ============================================================
create table if not exists public.user_preferences (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  country_code char(2)     not null default 'US',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users manage own preferences" on public.user_preferences;

create policy "Users manage own preferences"
  on public.user_preferences
  using (user_id = auth_uid())
  with check (user_id = auth_uid());

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute procedure set_updated_at();
