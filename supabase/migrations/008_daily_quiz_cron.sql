-- Run this in Supabase Dashboard → SQL Editor to schedule the daily quiz generator.
-- Prerequisite: pg_cron and pg_net extensions must be enabled.

-- Schedule at midnight UTC every day
SELECT cron.schedule(
    'generate-daily-quiz-midnight',
    '0 0 * * *',
    $$
    SELECT net.http_post(
        url     := current_setting('app.supabase_url') || '/functions/v1/generate-daily-quiz',
        headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body    := '{}'::jsonb
    ) AS request_id;
    $$
);

-- Verify
-- SELECT * FROM cron.job WHERE jobname = 'generate-daily-quiz-midnight';

-- Remove if needed
-- SELECT cron.unschedule('generate-daily-quiz-midnight');
