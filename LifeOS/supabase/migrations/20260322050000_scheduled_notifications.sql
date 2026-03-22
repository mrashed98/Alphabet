-- Scheduled Notifications — LOG-26
-- Stores push notification schedule metadata so mobile can cancel on entity delete.
-- Also adds push_token to user_preferences for server-side push dispatch.

-- ============================================================
-- 1. push_token on user_preferences
-- ============================================================
alter table public.user_preferences
  add column if not exists push_token text;

-- ============================================================
-- 2. scheduled_notifications table
-- ============================================================
-- linked_type values: 'contact_birthday' | 'life_event'
-- label values:       'T-7d' | 'T-1d' | 'day-of' | 'T-1month'

create table if not exists public.scheduled_notifications (
  id              uuid        primary key default uuid_generate_v4(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  linked_type     text        not null check (linked_type in ('contact_birthday', 'life_event')),
  linked_id       uuid        not null,
  label           text        not null,              -- 'T-7d', 'T-1d', 'day-of', 'T-1month'
  title           text        not null,
  body            text        not null,
  scheduled_for   timestamptz not null,
  push_token      text,                              -- snapshot of token at schedule time
  expo_ticket_id  text,                              -- receipt id from Expo push API
  sent_at         timestamptz,
  cancelled_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- one row per (linked entity, label); idempotent upserts
  unique (linked_id, label)
);

alter table public.scheduled_notifications enable row level security;

-- Users can read their own scheduled notifications (for cancellation on mobile)
create policy "Users read own scheduled_notifications" on public.scheduled_notifications
  for select using (user_id = auth_uid());

-- Service role (Edge Functions) handles all writes — bypasses RLS automatically
-- Index for the cron sender: find due, unsent, uncancelled rows
create index idx_sched_notif_due
  on public.scheduled_notifications (scheduled_for)
  where sent_at is null and cancelled_at is null;

-- Index for cancellation by linked entity
create index idx_sched_notif_linked
  on public.scheduled_notifications (linked_id, linked_type);
