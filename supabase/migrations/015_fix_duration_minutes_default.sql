-- Fix duration_minutes column to have a default value
-- This prevents NOT NULL constraint violations when duration_minutes is not provided

-- First, update any NULL values to 0
UPDATE public.reading_sessions 
SET duration_minutes = COALESCE(duration_minutes, CEIL(duration_seconds / 60.0)::INTEGER, 0)
WHERE duration_minutes IS NULL;

-- Now alter the column to have a default and make it NOT NULL
ALTER TABLE public.reading_sessions 
ALTER COLUMN duration_minutes SET DEFAULT 0;

-- If the column was created without NOT NULL, this ensures consistency
-- DO NOT add NOT NULL if it might break existing inserts
-- ALTER TABLE public.reading_sessions 
-- ALTER COLUMN duration_minutes SET NOT NULL;
