-- Cron job: fire send-due-notifications Edge Function every 5 minutes
-- LOG-26: notification scheduling
--
-- Requires pg_cron + pg_net extensions (enabled on Supabase Pro / Team plans).
-- On Starter plan use the Supabase Dashboard → Edge Functions → Schedule instead.
--
-- The job calls the Edge Function via an internal HTTP POST using pg_net.
-- SUPABASE_URL and SERVICE_ROLE_KEY are injected by Supabase at runtime;
-- replace the placeholder values below before applying to a live project.
--
-- NOTE: Supabase stores secrets in vault — reference them with
--   select decrypted_secret from vault.decrypted_secrets where name = '...';
-- For simplicity here we use the net.http_post helper with the project URL
-- and service role key passed as environment-level vault secrets.

-- Enable extensions if not already present
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any previous version of this cron job
select cron.unschedule('send-due-notifications')
where exists (
  select 1 from cron.job where jobname = 'send-due-notifications'
);

-- Schedule: every 5 minutes, POST to the Edge Function
-- Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> via Supabase secrets or CI injection.
select cron.schedule(
  'send-due-notifications',          -- job name
  '*/5 * * * *',                     -- every 5 minutes
  $$
    select net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/send-due-notifications',
      headers := jsonb_build_object(
        'Content-Type',   'application/json',
        'Authorization',  'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := '{}'::jsonb
    )
  $$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- How to set the required app settings (run once per database):
-- ─────────────────────────────────────────────────────────────────────────────
--   alter database postgres set app.supabase_url  = 'https://<ref>.supabase.co';
--   alter database postgres set app.service_role_key = '<service_role_key>';
--
-- Or reference them from vault:
--   select cron.schedule(
--     'send-due-notifications', '*/5 * * * *',
--     $job$
--       select net.http_post(
--         url     := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url') || '/functions/v1/send-due-notifications',
--         headers := jsonb_build_object(
--           'Content-Type',  'application/json',
--           'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
--         ),
--         body := '{}'::jsonb
--       )
--     $job$
--   );
-- ─────────────────────────────────────────────────────────────────────────────
