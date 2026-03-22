-- LifeOS Initial Schema
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Row Level Security helper: current user
create or replace function auth_uid() returns uuid as $$
  select auth.uid()
$$ language sql stable;

-- ============================================================
-- PROJECTS
-- ============================================================
create table public.projects (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  company    text,
  color      text,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
create policy "Users manage own projects" on public.projects
  using (user_id = auth_uid())
  with check (user_id = auth_uid());

-- ============================================================
-- TASKS
-- ============================================================
create type task_status as enum ('todo', 'in_progress', 'done', 'cancelled');
create type task_priority as enum ('low', 'medium', 'high', 'critical');

create table public.tasks (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  status      task_status not null default 'todo',
  priority    task_priority not null default 'medium',
  due_date    timestamptz,
  project_id  uuid references public.projects(id) on delete set null,
  company_id  uuid,  -- future: foreign key to companies table
  created_at  timestamptz not null default now()
);

alter table public.tasks enable row level security;
create policy "Users manage own tasks" on public.tasks
  using (user_id = auth_uid())
  with check (user_id = auth_uid());

create index idx_tasks_user_status on public.tasks(user_id, status);
create index idx_tasks_due_date on public.tasks(due_date);

-- ============================================================
-- EVENTS
-- ============================================================
create table public.events (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  start_at   timestamptz not null,
  end_at     timestamptz,
  all_day    boolean not null default false,
  location   text,
  notes      text,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
create policy "Users manage own events" on public.events
  using (user_id = auth_uid())
  with check (user_id = auth_uid());

create index idx_events_user_start on public.events(user_id, start_at);

-- ============================================================
-- HABITS
-- ============================================================
create type habit_frequency as enum ('daily', 'weekly');

create table public.habits (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  frequency   habit_frequency not null default 'daily',
  target_days integer[],  -- 0=Sun..6=Sat for weekly habits
  created_at  timestamptz not null default now()
);

alter table public.habits enable row level security;
create policy "Users manage own habits" on public.habits
  using (user_id = auth_uid())
  with check (user_id = auth_uid());

create table public.habit_logs (
  id           uuid primary key default uuid_generate_v4(),
  habit_id     uuid not null references public.habits(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  date         date not null,
  unique (habit_id, date)
);

alter table public.habit_logs enable row level security;
create policy "Users manage own habit logs" on public.habit_logs
  using (user_id = auth_uid())
  with check (user_id = auth_uid());

create index idx_habit_logs_habit_date on public.habit_logs(habit_id, date desc);

-- ============================================================
-- NOTES
-- ============================================================
create table public.notes (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  title          text not null,
  body           text,
  linked_task_id uuid references public.tasks(id) on delete set null,
  created_at     timestamptz not null default now()
);

alter table public.notes enable row level security;
create policy "Users manage own notes" on public.notes
  using (user_id = auth_uid())
  with check (user_id = auth_uid());

-- ============================================================
-- REMINDERS
-- ============================================================
create type reminder_recurrence as enum ('none', 'daily', 'weekly', 'monthly', 'yearly');
create type linked_type as enum ('task', 'event', 'habit', 'life_event');

create table public.reminders (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  remind_at    timestamptz not null,
  recurrence   reminder_recurrence not null default 'none',
  linked_id    uuid,
  linked_type  linked_type,
  created_at   timestamptz not null default now()
);

alter table public.reminders enable row level security;
create policy "Users manage own reminders" on public.reminders
  using (user_id = auth_uid())
  with check (user_id = auth_uid());

create index idx_reminders_user_remind on public.reminders(user_id, remind_at);

-- ============================================================
-- CONTACTS
-- ============================================================
create table public.contacts (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  birthday   text,   -- stored as MM-DD or YYYY-MM-DD
  email      text,
  phone      text,
  created_at timestamptz not null default now()
);

alter table public.contacts enable row level security;
create policy "Users manage own contacts" on public.contacts
  using (user_id = auth_uid())
  with check (user_id = auth_uid());

-- ============================================================
-- LIFE EVENTS
-- ============================================================
create type life_event_type as enum ('birthday', 'anniversary', 'wedding', 'holiday', 'custom');

create table public.life_events (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  event_type   life_event_type not null default 'custom',
  event_date   date not null,
  advance_days integer not null default 7,  -- days before to notify
  created_at   timestamptz not null default now()
);

alter table public.life_events enable row level security;
create policy "Users manage own life events" on public.life_events
  using (user_id = auth_uid())
  with check (user_id = auth_uid());

create index idx_life_events_user_date on public.life_events(user_id, event_date);
