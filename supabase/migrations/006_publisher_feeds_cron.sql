-- Alternative cron setup using pg_cron directly
-- Run this SQL in your Supabase dashboard → SQL Editor if config.toml cron is unavailable
-- Requires: pg_cron extension enabled AND pg_net extension enabled

-- Enable extensions (run once in Supabase dashboard)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── Store project config as settings ────────────────────────────────────────
-- Replace the values below with your actual project URL and service role key.
-- ALTER DATABASE postgres SET app.supabase_url = 'https://YOUR_PROJECT_ID.supabase.co';
-- ALTER DATABASE postgres SET app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';

-- ─── Schedule the edge function every 6 hours ─────────────────────────────────
SELECT cron.schedule(
    'fetch-publisher-feeds-every-6h',   -- job name (unique)
    '0 */6 * * *',                      -- cron expression: every 6 hours
    $$
    SELECT net.http_post(
        url     := current_setting('app.supabase_url') || '/functions/v1/fetch-publisher-feeds',
        headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body    := '{}'::jsonb
    ) AS request_id;
    $$
);

-- ─── Verify scheduled jobs ───────────────────────────────────────────────────
-- SELECT * FROM cron.job;

-- ─── Remove job if needed ────────────────────────────────────────────────────
-- SELECT cron.unschedule('fetch-publisher-feeds-every-6h');
