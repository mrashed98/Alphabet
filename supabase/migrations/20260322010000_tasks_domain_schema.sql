-- Tasks Domain Schema — Phase 1 additions
-- Adds: companies, task_tags, and missing columns on tasks/projects

-- ============================================================
-- COMPANIES
-- ============================================================
create table public.companies (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  color      text,
  icon       text,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;
create policy "Users manage own companies" on public.companies
  using (user_id = auth_uid())
  with check (user_id = auth_uid());

-- ============================================================
-- PROJECTS — add company FK, icon, archived_at
-- ============================================================
alter table public.projects
  add column company_id  uuid references public.companies(id) on delete set null,
  add column icon        text,
  add column archived_at timestamptz;

create index idx_projects_user_company on public.projects(user_id, company_id);

-- ============================================================
-- TASKS — add parent_task_id, recurring_rule, updated_at
-- ============================================================
alter table public.tasks
  add column parent_task_id uuid references public.tasks(id) on delete set null,
  add column recurring_rule text,        -- iCal RRULE string, e.g. "FREQ=DAILY;INTERVAL=1"
  add column updated_at     timestamptz not null default now();

create index idx_tasks_parent on public.tasks(parent_task_id) where parent_task_id is not null;

-- Auto-update updated_at on tasks
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute procedure set_updated_at();

-- ============================================================
-- TASK TAGS
-- ============================================================
create table public.task_tags (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  color      text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.task_tags enable row level security;
create policy "Users manage own task tags" on public.task_tags
  using (user_id = auth_uid())
  with check (user_id = auth_uid());

-- Junction table: task ↔ tag (many-to-many)
create table public.task_tag_assignments (
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id  uuid not null references public.task_tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

alter table public.task_tag_assignments enable row level security;
-- Policy checks via task ownership — user must own the task
create policy "Users manage own task tag assignments" on public.task_tag_assignments
  using (
    exists (
      select 1 from public.tasks
      where id = task_id and user_id = auth_uid()
    )
  )
  with check (
    exists (
      select 1 from public.tasks
      where id = task_id and user_id = auth_uid()
    )
  );

create index idx_task_tag_assignments_tag on public.task_tag_assignments(tag_id);
