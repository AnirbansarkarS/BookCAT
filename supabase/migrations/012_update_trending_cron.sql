-- Update the cron job to include all 4 lists and use the overview endpoint
SELECT cron.unschedule('fetch-nyt-bestsellers-weekly');

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
