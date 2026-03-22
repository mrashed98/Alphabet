-- Tasks Sprint 1 — add inbox status, missing columns, company-scoped indexes
-- Depends on: 20260322000000_initial_schema.sql, 20260322010000_tasks_domain_schema.sql

-- ============================================================
-- 1. Add 'inbox' to task_status enum
-- ============================================================
-- Postgres requires a transaction-safe ALTER TYPE … ADD VALUE call.
-- Using DO block so we can guard with IF NOT EXISTS logic.
do $$ begin
  alter type task_status add value if not exists 'inbox';
exception when duplicate_object then null;
end $$;

-- ============================================================
-- 2. Add missing columns to tasks
-- ============================================================
alter table public.tasks
  add column if not exists created_by   uuid references auth.users(id) on delete set null,
  add column if not exists assigned_to  uuid references auth.users(id) on delete set null,
  add column if not exists completed_at timestamptz;

-- Backfill created_by from user_id for pre-existing rows
update public.tasks set created_by = user_id where created_by is null;

-- ============================================================
-- 3. Company-scoped indexes for Sprint 1 query patterns
-- ============================================================
create index if not exists idx_tasks_company_status
  on public.tasks(company_id, status)
  where company_id is not null;

create index if not exists idx_tasks_company_due_date
  on public.tasks(company_id, due_date)
  where company_id is not null;

create index if not exists idx_tasks_company_priority
  on public.tasks(company_id, priority)
  where company_id is not null;

-- Composite index for the default sort (priority desc, due_date asc) per user
create index if not exists idx_tasks_user_priority_due
  on public.tasks(user_id, priority desc, due_date asc nulls last);

-- ============================================================
-- 4. Auto-set completed_at when status transitions to 'done'
-- ============================================================
create or replace function set_task_completed_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'done' and old.status <> 'done' then
    new.completed_at = coalesce(new.completed_at, now());
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_set_completed_at on public.tasks;
create trigger tasks_set_completed_at
  before update on public.tasks
  for each row execute procedure set_task_completed_at();
