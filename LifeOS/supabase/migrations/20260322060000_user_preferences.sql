-- LOG-28: user_preferences table for country_code (holiday overlay on calendar)

create table if not exists public.user_preferences (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade unique,
  country_code char(2) not null default 'US',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users manage own preferences" on public.user_preferences;
create policy "Users manage own preferences"
  on public.user_preferences
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Auto-update updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists touch_user_preferences_updated_at on public.user_preferences;
create trigger touch_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute procedure public.touch_updated_at();
