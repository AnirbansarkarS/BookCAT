-- ============================================================
-- Weekly Trending Books (NYT Bestsellers)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.weekly_trending_books (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    author      TEXT,
    isbn        TEXT,
    image_url   TEXT,
    amazon_url  TEXT,
    description TEXT,
    rank        INT NOT NULL,
    list_name   TEXT DEFAULT 'hardcover-fiction',
    publisher   TEXT,
    week_start  DATE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Only one set of entries per list per week
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_trending_unique
    ON public.weekly_trending_books (isbn, week_start, list_name)
    WHERE isbn IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_weekly_trending_week
    ON public.weekly_trending_books (week_start DESC, rank ASC);

-- ── RLS ───────────────────────────────────────────────────
ALTER TABLE public.weekly_trending_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trending books are public"
    ON public.weekly_trending_books FOR SELECT
    USING (true);

CREATE POLICY "Service role manages trending books"
    ON public.weekly_trending_books FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
