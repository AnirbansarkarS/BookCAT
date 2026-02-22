-- Run this in Supabase Dashboard → SQL Editor to schedule weekly NYT bestseller fetching.
-- Prerequisite: pg_cron and pg_net extensions must be enabled.
-- Runs every Sunday at 00:05 UTC so NYT has updated their list by then.

SELECT cron.schedule(
    'fetch-nyt-bestsellers-weekly',
    '5 0 * * 0',   -- 00:05 UTC every Sunday
    $$
    SELECT net.http_post(
        url     := current_setting('app.supabase_url') || '/functions/v1/fetch-nyt-bestsellers',
        headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body    := '{"lists":["hardcover-fiction","hardcover-nonfiction","young-adult-hardcover","paperback-nonfiction"]}'::jsonb
    ) AS request_id;
    $$
);

-- Verify
-- SELECT * FROM cron.job WHERE jobname = 'fetch-nyt-bestsellers-weekly';

-- Remove if needed
-- SELECT cron.unschedule('fetch-nyt-bestsellers-weekly');
